# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""AgentAccessBond: bonded web-access accountability for agents."""

import json
from dataclasses import dataclass

from genlayer import *
import genlayer.gl.vm as glvm


ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
MAX_ID_LENGTH = 64
MAX_USER_AGENT_LENGTH = 120
MAX_URL_LENGTH = 240
MAX_PURPOSE_LENGTH = 240
MAX_SOURCE_CHARS = 12_000
MAX_PROMPT_EVIDENCE_CHARS = 2_000
AGENT_STATUSES = ("DRAFT", "ACTIVE", "QUARANTINED", "PENDING_REVIEW", "CLOSED")
CASE_STATUSES = ("OPEN", "RETRYABLE", "RESOLVED")
APPLICABILITIES = ("COMPLIANT", "MATERIAL_VIOLATION", "UNVERIFIABLE")
SOURCE_COVERAGES = ("SUFFICIENT", "PARTIAL", "FAILED")
VIOLATION_TYPES = (
    "DISALLOWED_PATH",
    "USER_AGENT_MISMATCH",
    "POLICY_SCOPE_BREACH",
    "RECEIPT_INSUFFICIENT",
    "NONE",
)
ACTIONS = ("KEEP_ACTIVE", "QUARANTINE_AND_CREDIT", "PAUSE_AND_RETRY")
FACT_IDS = ("USER_AGENT", "TARGET_PATH", "ROBOTS_RULE", "POLICY_SCOPE", "RECEIPT")
MAX_RATIONALE_LENGTH = 600


@allow_storage
@dataclass
class Agent:
    agent_id: str
    operator: Address
    user: Address
    user_agent: str
    origin: str
    policy_url: str
    allowed_purpose: str
    operator_bond: u256
    minimum_challenge_bond: u256
    penalty_amount: u256
    status: str
    accepted: bool
    active_case_id: str
    case_count: u256
    close_proposed_by: Address


@allow_storage
@dataclass
class AccessCase:
    case_id: str
    agent_id: str
    opened_by: Address
    target_url: str
    receipt_url: str
    challenge_bond: u256
    status: str
    attempt_count: u256
    verdict_id: str
    bond_settled: bool


@allow_storage
@dataclass
class Verdict:
    verdict_id: str
    case_id: str
    agent_id: str
    target_url: str
    applicability: str
    source_coverage: str
    violation_type: str
    required_action: str
    matched_fact_ids: str
    rationale: str
    previous_agent_status: str
    new_agent_status: str
    user_credit_amount: u256
    operator_credit_amount: u256
    attempt: u256


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise Exception(message)


def _bounded_text(value: str, name: str, max_length: int) -> str:
    text = str(value).strip()
    _require(len(text) > 0, f"{name} is required")
    _require(len(text) <= max_length, f"{name} is too long")
    return text


def _valid_https_url(value: str, name: str) -> str:
    text = _bounded_text(value, name, MAX_URL_LENGTH)
    _require(text.startswith("https://"), f"{name} must use https")
    return text


def _parse_json_object(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    text = str(raw).strip().replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    end = text.rfind("}") + 1
    for start in range(len(text)):
        if text[start] != "{":
            continue
        try:
            parsed = json.loads(text[start:end])
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            continue
    raise ValueError("Expected JSON object")


def _decode_source_body(value) -> str:
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    return str(value)


def _body_from_response(value):
    if hasattr(value, "body"):
        return value.body
    if isinstance(value, dict):
        if "body" in value:
            return value.get("body", "")
        if "response" in value and isinstance(value.get("response"), dict):
            return value.get("response", {}).get("body", "")
        if "ok" in value and isinstance(value.get("ok"), dict):
            ok = value.get("ok", {})
            if "response" in ok and isinstance(ok.get("response"), dict):
                return ok.get("response", {}).get("body", "")
    return value


def _limit_source(value, label: str) -> str:
    body = _body_from_response(value)
    text = _decode_source_body(body)
    if text.strip().startswith("{"):
        try:
            parsed = json.loads(text)
            nested_body = _body_from_response(parsed)
            if nested_body is not parsed:
                text = _decode_source_body(nested_body)
        except Exception:
            pass
    _require(len(text) > 0, f"{label} source is empty")
    _require(len(text) <= MAX_SOURCE_CHARS, f"{label} source is too large")
    return text


def _compact_policy_evidence(text: str, target_url: str) -> str:
    target_path = "/"
    if "://" in target_url:
        after_host = target_url.split("://", 1)[1].split("/", 1)
        if len(after_host) > 1:
            target_path = "/" + after_host[1]
    target_prefix = target_path.split("?", 1)[0]
    lines = []
    for raw_line in text.replace("\r", "\n").split("\n"):
        line = raw_line.strip()
        lower = line.lower()
        if (
            lower.startswith("user-agent:")
            or lower.startswith("allow:")
            or lower.startswith("disallow:")
            or target_prefix.startswith(line.replace("Disallow:", "").strip())
            or "/search" in lower
        ):
            lines.append(line)
        if len("\n".join(lines)) >= MAX_PROMPT_EVIDENCE_CHARS:
            break
    compact = "\n".join(lines).strip()
    if len(compact) == 0:
        compact = text[:MAX_PROMPT_EVIDENCE_CHARS]
    return compact[:MAX_PROMPT_EVIDENCE_CHARS]


def _target_path(target_url: str) -> str:
    if "://" not in target_url:
        return "/"
    parts = target_url.split("://", 1)[1].split("/", 1)
    if len(parts) == 1:
        return "/"
    return "/" + parts[1].split("?", 1)[0]


def _validate_receipt_text(receipt_text: str, agent: Agent, case: AccessCase) -> str:
    parsed = _parse_json_object(receipt_text)
    _require(
        str(parsed.get("agent_id", "")) == agent.agent_id,
        "Receipt agent mismatch",
    )
    _require(
        str(parsed.get("case_id", "")) == case.case_id,
        "Receipt case mismatch",
    )
    _require(
        str(parsed.get("target_url", "")) == case.target_url,
        "Receipt target mismatch",
    )
    _require(
        str(parsed.get("user_agent", "")) == agent.user_agent,
        "Receipt user-agent mismatch",
    )
    return json.dumps(
        {
            "agent_id": parsed.get("agent_id"),
            "case_id": parsed.get("case_id"),
            "user_agent": parsed.get("user_agent"),
            "method": parsed.get("method"),
            "target_url": parsed.get("target_url"),
            "declared_policy_basis": parsed.get("declared_policy_basis"),
        },
        sort_keys=True,
    )


def _canonical_fact_ids(value) -> list[str]:
    if not isinstance(value, list):
        return []
    result: list[str] = []
    for item in value:
        fact_id = str(item).upper()
        if fact_id in FACT_IDS and fact_id not in result:
            result.append(fact_id)
    result.sort()
    return result


def _canonical_fact_text(value) -> str:
    return ",".join(_canonical_fact_ids(value))


def _action_for_applicability(applicability: str) -> str:
    if applicability == "MATERIAL_VIOLATION":
        return "QUARANTINE_AND_CREDIT"
    if applicability == "UNVERIFIABLE":
        return "PAUSE_AND_RETRY"
    return "KEEP_ACTIVE"


def _status_for_applicability(applicability: str) -> str:
    if applicability == "MATERIAL_VIOLATION":
        return "QUARANTINED"
    if applicability == "UNVERIFIABLE":
        return "PENDING_REVIEW"
    return "ACTIVE"


@gl.evm.contract_interface
class _NativeRecipient:
    class View:
        pass

    class Write:
        pass


class AgentAccessBond(gl.Contract):
    agents: TreeMap[str, Agent]
    cases: TreeMap[str, AccessCase]
    verdicts: TreeMap[str, Verdict]
    credits: TreeMap[Address, u256]
    total_locked_operator_bonds: u256
    total_locked_challenge_bonds: u256
    total_withdrawable_credits: u256

    def __init__(self):
        self.total_locked_operator_bonds = u256(0)
        self.total_locked_challenge_bonds = u256(0)
        self.total_withdrawable_credits = u256(0)

    @gl.public.view
    def get_agent(self, agent_id: str) -> Agent:
        _require(agent_id in self.agents, "Agent not found")
        return self.agents[agent_id]

    @gl.public.view
    def get_agent_status(self, agent_id: str) -> str:
        return self.get_agent(agent_id).status

    @gl.public.view
    def can_execute(self, agent_id: str) -> bool:
        agent = self.get_agent(agent_id)
        return agent.accepted and agent.status == "ACTIVE" and agent.active_case_id == ""

    @gl.public.view
    def get_accounting(self) -> dict:
        return {
            "locked_operator_bonds": self.total_locked_operator_bonds,
            "locked_challenge_bonds": self.total_locked_challenge_bonds,
            "withdrawable_credits": self.total_withdrawable_credits,
        }

    @gl.public.view
    def get_credit(self, account: Address) -> u256:
        return self.credits.get(Address(account), u256(0))

    @gl.public.view
    def get_case(self, case_id: str) -> AccessCase:
        _require(case_id in self.cases, "Case not found")
        return self.cases[case_id]

    @gl.public.view
    def get_verdict(self, verdict_id: str) -> Verdict:
        _require(verdict_id in self.verdicts, "Verdict not found")
        return self.verdicts[verdict_id]

    def _credit(self, recipient: Address, amount: u256) -> None:
        if int(amount) == 0:
            return
        existing = self.credits.get(recipient, u256(0))
        self.credits[recipient] = u256(int(existing) + int(amount))
        self.total_withdrawable_credits = u256(
            int(self.total_withdrawable_credits) + int(amount)
        )

    @gl.public.write.payable
    def create_agent(
        self,
        agent_id: str,
        user: Address,
        user_agent: str,
        origin: str,
        policy_url: str,
        allowed_purpose: str,
        penalty_amount: u256,
        minimum_challenge_bond: u256,
    ) -> None:
        normalized_id = _bounded_text(agent_id, "agent_id", MAX_ID_LENGTH)
        _require(normalized_id not in self.agents, "Agent already exists")
        user_address = Address(user)
        _require(user_address != Address(ZERO_ADDRESS), "User is required")
        normalized_user_agent = _bounded_text(
            user_agent, "user_agent", MAX_USER_AGENT_LENGTH
        )
        normalized_origin = _valid_https_url(origin, "origin")
        normalized_policy_url = _valid_https_url(policy_url, "policy_url")
        normalized_purpose = _bounded_text(
            allowed_purpose, "allowed_purpose", MAX_PURPOSE_LENGTH
        )
        value = u256(gl.message.value)
        _require(value > 0, "Operator bond is required")
        _require(penalty_amount > 0, "Penalty amount is required")
        _require(value >= penalty_amount, "Operator bond below penalty")
        _require(minimum_challenge_bond > 0, "Challenge bond is required")

        self.agents[normalized_id] = Agent(
            agent_id=normalized_id,
            operator=gl.message.sender_address,
            user=user_address,
            user_agent=normalized_user_agent,
            origin=normalized_origin,
            policy_url=normalized_policy_url,
            allowed_purpose=normalized_purpose,
            operator_bond=value,
            minimum_challenge_bond=minimum_challenge_bond,
            penalty_amount=penalty_amount,
            status="DRAFT",
            accepted=False,
            active_case_id="",
            case_count=u256(0),
            close_proposed_by=Address(ZERO_ADDRESS),
        )
        self.total_locked_operator_bonds += value

    @gl.public.write
    def accept_agent(self, agent_id: str) -> None:
        _require(agent_id in self.agents, "Agent not found")
        agent = self.agents[agent_id]
        _require(agent.status == "DRAFT" and not agent.accepted, "Agent cannot be accepted")
        _require(
            gl.message.sender_address == agent.user,
            "Only designated user can accept agent",
        )
        agent.status = "ACTIVE"
        agent.accepted = True
        self.agents[agent_id] = agent

    @gl.public.write.payable
    def open_access_case(
        self,
        case_id: str,
        agent_id: str,
        target_url: str,
        receipt_url: str,
    ) -> None:
        normalized_case_id = _bounded_text(case_id, "case_id", MAX_ID_LENGTH)
        _require(normalized_case_id not in self.cases, "Case already exists")
        _require(agent_id in self.agents, "Agent not found")
        agent = self.agents[agent_id]
        _require(agent.accepted, "Agent is not active")
        _require(agent.status in ("ACTIVE", "PENDING_REVIEW"), "Agent cannot open case")
        _require(agent.active_case_id == "", "Agent already has an active case")
        normalized_target = _valid_https_url(target_url, "target_url")
        _require(
            normalized_target.startswith(agent.origin.rstrip("/") + "/"),
            "Target must be under agent origin",
        )
        normalized_receipt = _valid_https_url(receipt_url, "receipt_url")
        challenge_value = u256(gl.message.value)
        _require(
            challenge_value >= agent.minimum_challenge_bond,
            "Challenge bond is too low",
        )

        self.cases[normalized_case_id] = AccessCase(
            case_id=normalized_case_id,
            agent_id=agent_id,
            opened_by=gl.message.sender_address,
            target_url=normalized_target,
            receipt_url=normalized_receipt,
            challenge_bond=challenge_value,
            status="OPEN",
            attempt_count=u256(0),
            verdict_id="",
            bond_settled=False,
        )
        agent.active_case_id = normalized_case_id
        agent.case_count += u256(1)
        self.agents[agent_id] = agent
        self.total_locked_challenge_bonds += challenge_value

    def _robots_url(self, origin: str) -> str:
        return origin.rstrip("/") + "/robots.txt"

    def _normalize_access_result(
        self,
        raw_result,
        agent: Agent,
        case: AccessCase,
    ) -> dict:
        parsed = _parse_json_object(raw_result)
        applicability = str(parsed.get("applicability", "")).upper()
        source_coverage = str(parsed.get("source_coverage", "")).upper()
        violation_type = str(parsed.get("violation_type", "")).upper()
        required_action = str(parsed.get("required_action", "")).upper()
        _require(str(parsed.get("agent_id", "")) == agent.agent_id, "Result agent mismatch")
        _require(str(parsed.get("case_id", "")) == case.case_id, "Result case mismatch")
        _require(
            str(parsed.get("target_url", "")) == case.target_url,
            "Result target mismatch",
        )
        _require(applicability in APPLICABILITIES, "Invalid applicability")
        _require(source_coverage in SOURCE_COVERAGES, "Invalid source coverage")
        _require(violation_type in VIOLATION_TYPES, "Invalid violation type")
        _require(required_action in ACTIONS, "Invalid required action")
        _require(
            required_action == _action_for_applicability(applicability),
            "Action does not match applicability",
        )
        rationale = str(parsed.get("rationale", "")).strip()
        _require(0 < len(rationale) <= MAX_RATIONALE_LENGTH, "Invalid rationale")
        return {
            "agent_id": agent.agent_id,
            "case_id": case.case_id,
            "target_url": case.target_url,
            "applicability": applicability,
            "source_coverage": source_coverage,
            "violation_type": violation_type,
            "required_action": required_action,
            "matched_fact_ids": _canonical_fact_text(parsed.get("matched_fact_ids", [])),
            "rationale": rationale,
        }

    def _evaluate_access_case(self, agent: Agent, case: AccessCase) -> dict:
        def evaluate():
            robots = _limit_source(
                gl.nondet.web.get(self._robots_url(agent.origin)),
                "robots",
            )
            policy = _limit_source(gl.nondet.web.get(agent.policy_url), "policy")
            receipt = _validate_receipt_text(
                _limit_source(gl.nondet.web.get(case.receipt_url), "receipt"),
                agent,
                case,
            )
            robots_evidence = _compact_policy_evidence(robots, case.target_url)
            policy_evidence = _compact_policy_evidence(policy, case.target_url)
            combined = (robots_evidence + "\n" + policy_evidence).lower()
            path = _target_path(case.target_url)
            disallowed = False
            for raw_line in combined.split("\n"):
                line = raw_line.strip()
                if not line.startswith("disallow:"):
                    continue
                rule = line.split(":", 1)[1].strip()
                if len(rule) > 0 and path.startswith(rule.split("?", 1)[0]):
                    disallowed = True
            if disallowed:
                return {
                    "agent_id": agent.agent_id,
                    "case_id": case.case_id,
                    "target_url": case.target_url,
                    "applicability": "MATERIAL_VIOLATION",
                    "source_coverage": "SUFFICIENT",
                    "violation_type": "DISALLOWED_PATH",
                    "required_action": "QUARANTINE_AND_CREDIT",
                    "matched_fact_ids": "RECEIPT,ROBOTS_RULE,TARGET_PATH,USER_AGENT",
                    "rationale": "Receipt target path matches a disallow rule in bounded public policy evidence.",
                }
            return {
                "agent_id": agent.agent_id,
                "case_id": case.case_id,
                "target_url": case.target_url,
                "applicability": "COMPLIANT",
                "source_coverage": "SUFFICIENT",
                "violation_type": "NONE",
                "required_action": "KEEP_ACTIVE",
                "matched_fact_ids": "RECEIPT,TARGET_PATH,USER_AGENT",
                "rationale": "Bounded public evidence did not expose a matching disallow rule.",
            }

        def validator_fn(leader_result: glvm.Result) -> bool:
            if not isinstance(leader_result, glvm.Return):
                return False
            proposed = leader_result.calldata
            replay = evaluate()
            return (
                replay["agent_id"] == proposed["agent_id"]
                and replay["case_id"] == proposed["case_id"]
                and replay["target_url"] == proposed["target_url"]
                and replay["applicability"] == proposed["applicability"]
                and replay["source_coverage"] == proposed["source_coverage"]
                and replay["violation_type"] == proposed["violation_type"]
                and replay["required_action"] == proposed["required_action"]
                and replay["matched_fact_ids"] == proposed["matched_fact_ids"]
            )

        return gl.vm.run_nondet_unsafe(evaluate, validator_fn)

    @gl.public.write
    def adjudicate_case(self, case_id: str) -> str:
        _require(case_id in self.cases, "Case not found")
        case = self.cases[case_id]
        _require(case.status == "OPEN", "Case is not open")
        agent = self.agents[case.agent_id]
        result = self._evaluate_access_case(agent, case)

        next_attempt = case.attempt_count + u256(1)
        verdict_id = "verdict-" + case.case_id + "-" + str(int(next_attempt))
        previous_status = agent.status
        new_status = _status_for_applicability(result["applicability"])
        user_credit = u256(0)
        operator_credit = u256(0)

        if result["applicability"] == "MATERIAL_VIOLATION":
            user_credit = agent.penalty_amount
            agent.operator_bond -= agent.penalty_amount
            self.total_locked_operator_bonds -= agent.penalty_amount
            self.total_locked_challenge_bonds -= case.challenge_bond
            self._credit(agent.user, agent.penalty_amount)
            self._credit(case.opened_by, case.challenge_bond)
            case.bond_settled = True
        elif result["applicability"] == "COMPLIANT":
            operator_credit = case.challenge_bond
            self.total_locked_challenge_bonds -= case.challenge_bond
            self._credit(agent.operator, case.challenge_bond)
            case.bond_settled = True

        verdict = Verdict(
            verdict_id=verdict_id,
            case_id=case.case_id,
            agent_id=agent.agent_id,
            target_url=case.target_url,
            applicability=result["applicability"],
            source_coverage=result["source_coverage"],
            violation_type=result["violation_type"],
            required_action=result["required_action"],
            matched_fact_ids=result["matched_fact_ids"],
            rationale=result["rationale"],
            previous_agent_status=previous_status,
            new_agent_status=new_status,
            user_credit_amount=user_credit,
            operator_credit_amount=operator_credit,
            attempt=next_attempt,
        )
        self.verdicts[verdict_id] = verdict

        case.attempt_count = next_attempt
        case.verdict_id = verdict_id
        if result["applicability"] == "UNVERIFIABLE":
            case.status = "RETRYABLE"
        else:
            case.status = "RESOLVED"
            agent.active_case_id = ""
        agent.status = new_status
        self.cases[case_id] = case
        self.agents[agent.agent_id] = agent
        return verdict_id

    @gl.public.write
    def retry_case(self, case_id: str) -> None:
        _require(case_id in self.cases, "Case not found")
        case = self.cases[case_id]
        _require(case.status == "RETRYABLE", "Case is not retryable")
        agent = self.agents[case.agent_id]
        _require(
            gl.message.sender_address == agent.operator
            or gl.message.sender_address == agent.user
            or gl.message.sender_address == case.opened_by,
            "Only case party can retry",
        )
        case.status = "OPEN"
        self.cases[case_id] = case

    @gl.public.write
    def withdraw_credit(self, amount: u256) -> None:
        requested = u256(int(amount))
        _require(requested > 0, "Withdrawal amount must be positive")
        sender = gl.message.sender_address
        available = self.credits.get(sender, u256(0))
        _require(requested <= available, "Insufficient credit")
        self.credits[sender] = u256(int(available) - int(requested))
        self.total_withdrawable_credits = u256(
            int(self.total_withdrawable_credits) - int(requested)
        )
        _NativeRecipient(sender).emit_transfer(value=requested)

    @gl.public.write
    def propose_close(self, agent_id: str) -> None:
        _require(agent_id in self.agents, "Agent not found")
        agent = self.agents[agent_id]
        _require(agent.active_case_id == "", "Agent has an active case")
        sender = gl.message.sender_address
        _require(
            sender == agent.operator or sender == agent.user,
            "Only agent party can close",
        )
        agent.close_proposed_by = sender
        self.agents[agent_id] = agent

    @gl.public.write
    def accept_close(self, agent_id: str) -> None:
        _require(agent_id in self.agents, "Agent not found")
        agent = self.agents[agent_id]
        sender = gl.message.sender_address
        _require(agent.close_proposed_by != Address(ZERO_ADDRESS), "Close not proposed")
        _require(
            sender == agent.operator or sender == agent.user,
            "Only agent party can close",
        )
        _require(sender != agent.close_proposed_by, "Close requires the other party")
        _require(agent.active_case_id == "", "Agent has an active case")
        remaining = agent.operator_bond
        agent.operator_bond = u256(0)
        agent.status = "CLOSED"
        agent.close_proposed_by = Address(ZERO_ADDRESS)
        self.total_locked_operator_bonds = u256(
            int(self.total_locked_operator_bonds) - int(remaining)
        )
        self._credit(agent.operator, remaining)
        self.agents[agent_id] = agent
