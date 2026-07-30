"""Direct-mode tests for AgentAccessBond lifecycle."""

import json

from eth_keys import keys
from eth_utils import keccak

from tests.direct.conftest import to_hex


CONTRACT_PATH = "contracts/agent_access_bond.py"
OPERATOR_BOND = 500
PENALTY_AMOUNT = 100
CHALLENGE_BOND = 10
TEST_PRIVATE_KEY = keys.PrivateKey(bytes.fromhex("11" * 32))
ATTESTOR_PUBLIC_KEY = "0x04" + TEST_PRIVATE_KEY.public_key.to_bytes().hex()
EVENT_ID = "event-1"
ROBOTS_URL = "https://example.com/robots.txt?v=1"
POLICY_URL = "https://example.com/policy/v1.txt"
RECEIPT_URL = "https://example.com/receipts/event-1.json"
POLICY_TEXT = "AgentAccessBot may only fetch public research pages."


def content_hash(text):
    return "0x" + keccak(text=text).hex()


def signed_receipt(robots_body, policy_body=POLICY_TEXT, **overrides):
    payload = {
        "schema": "agent-access-event/v1",
        "event_id": EVENT_ID,
        "agent_id": "agent-alpha",
        "user_agent": "AgentAccessBot/1.0",
        "method": "GET",
        "target_url": "https://example.com/private/report",
        "occurred_at": "2026-07-30T10:00:00Z",
        "nonce": "runner-nonce-1",
        "policy_version": "v1",
        "policy_url": POLICY_URL,
        "policy_hash": content_hash(policy_body),
        "robots_version": "v1",
        "robots_url": ROBOTS_URL,
        "robots_hash": content_hash(robots_body),
        "attestor_public_key": ATTESTOR_PUBLIC_KEY,
    }
    payload.update(overrides)
    canonical = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")
    signature = TEST_PRIVATE_KEY.sign_msg_hash(keccak(canonical))
    return {
        **payload,
        "signature": "0x"
        + signature.r.to_bytes(32, "big").hex()
        + signature.s.to_bytes(32, "big").hex(),
    }


def result_with_attestation(result, robots_body, policy_body=POLICY_TEXT):
    receipt = signed_receipt(robots_body, policy_body)
    return {
        **result,
        "event_id": receipt["event_id"],
        "occurred_at": receipt["occurred_at"],
        "attestor_public_key": receipt["attestor_public_key"],
        "policy_version": receipt["policy_version"],
        "policy_url": receipt["policy_url"],
        "policy_hash": receipt["policy_hash"],
        "robots_version": receipt["robots_version"],
        "robots_url": receipt["robots_url"],
        "robots_hash": receipt["robots_hash"],
        "attestation_verified": True,
    }


def create_agent(
    contract,
    vm,
    operator,
    user,
    agent_id="agent-alpha",
):
    vm.sender = operator
    vm.value = OPERATOR_BOND
    contract.create_agent(
        agent_id,
        to_hex(user),
        "AgentAccessBot/1.0",
        "https://example.com",
        POLICY_URL,
        "research only",
        PENALTY_AMOUNT,
        CHALLENGE_BOND,
        ATTESTOR_PUBLIC_KEY,
    )
    contract_address = vm._contract_address
    current_balance = vm._balances.get(bytes(contract_address), 0)
    vm.deal(contract_address, current_balance + OPERATOR_BOND)
    vm.value = 0


def create_and_accept_agent(contract, vm, operator, user, agent_id="agent-alpha"):
    create_agent(contract, vm, operator, user, agent_id)
    vm.sender = user
    contract.accept_agent(agent_id)


def open_access_case(
    contract,
    vm,
    opener,
    case_id="case-1",
    agent_id="agent-alpha",
    target_url="https://example.com/private/report",
    receipt_url=RECEIPT_URL,
    value=CHALLENGE_BOND,
):
    vm.sender = opener
    vm.value = value
    contract.open_access_case(
        case_id,
        agent_id,
        EVENT_ID,
        target_url,
        receipt_url,
    )
    contract_address = vm._contract_address
    current_balance = vm._balances.get(bytes(contract_address), 0)
    vm.deal(contract_address, current_balance + value)
    vm.value = 0


def mock_access_result(vm, result):
    robots_body = (
        "User-agent: AgentAccessBot\nDisallow: /private/"
        if result["applicability"] == "MATERIAL_VIOLATION"
        else "User-agent: AgentAccessBot\nDisallow: /admin/"
    )
    vm.mock_web(
        r".*example\.com/robots\.txt\?v=1",
        {
            "method": "GET",
            "status": 200,
            "body": robots_body,
        },
    )
    vm.mock_web(
        r".*example\.com/policy/v1\.txt",
        {
            "method": "GET",
            "status": 200,
            "body": POLICY_TEXT,
        },
    )
    vm.mock_web(
        r".*example\.com/receipts/event-1\.json",
        {
            "method": "GET",
            "status": 200,
            "body": json.dumps(signed_receipt(robots_body)),
        },
    )
    vm.mock_llm(
        (
            r"(?s).*AgentAccessBond adjudicator.*"
            r"Allowed applicability: COMPLIANT, MATERIAL_VIOLATION, "
            r"UNVERIFIABLE\..*"
        ),
        json.dumps(result),
    )


def access_result(applicability, **overrides):
    action = {
        "COMPLIANT": "KEEP_ACTIVE",
        "MATERIAL_VIOLATION": "QUARANTINE_AND_CREDIT",
        "UNVERIFIABLE": "PAUSE_AND_RETRY",
    }[applicability]
    result = {
        "agent_id": "agent-alpha",
        "case_id": "case-1",
        "target_url": "https://example.com/private/report",
        "applicability": applicability,
        "source_coverage": "SUFFICIENT"
        if applicability != "UNVERIFIABLE"
        else "FAILED",
        "violation_type": "DISALLOWED_PATH"
        if applicability == "MATERIAL_VIOLATION"
        else "NONE",
        "required_action": action,
        "matched_fact_ids": ["USER_AGENT", "TARGET_PATH"],
        "rationale": "Bounded public evidence supports the result.",
    }
    result.update(overrides)
    return result


def test_operator_and_user_activate_immutable_agent(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_owner,
):
    contract = direct_deploy(CONTRACT_PATH)

    create_agent(contract, direct_vm, direct_alice, direct_bob)

    draft = contract.get_agent("agent-alpha")
    assert draft.status == "DRAFT"
    assert draft.operator.as_hex == to_hex(direct_alice)
    assert draft.user.as_hex == to_hex(direct_bob)
    assert draft.user_agent == "AgentAccessBot/1.0"
    assert int(draft.operator_bond) == OPERATOR_BOND
    assert contract.can_execute("agent-alpha") is False

    direct_vm.sender = direct_owner
    with direct_vm.expect_revert("Only designated user can accept agent"):
        contract.accept_agent("agent-alpha")

    direct_vm.sender = direct_bob
    contract.accept_agent("agent-alpha")

    active = contract.get_agent("agent-alpha")
    assert active.accepted is True
    assert active.status == "ACTIVE"
    assert contract.get_agent_status("agent-alpha") == "ACTIVE"
    assert contract.can_execute("agent-alpha") is True

    with direct_vm.expect_revert("Agent cannot be accepted"):
        contract.accept_agent("agent-alpha")


def test_material_violation_quarantines_agent_and_records_verdict(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    contract = direct_deploy(CONTRACT_PATH)
    create_and_accept_agent(contract, direct_vm, direct_alice, direct_bob)
    open_access_case(contract, direct_vm, direct_charlie)
    mock_access_result(direct_vm, access_result("MATERIAL_VIOLATION"))

    verdict_id = contract.adjudicate_case("case-1")

    case = contract.get_case("case-1")
    verdict = contract.get_verdict(verdict_id)
    assert case.status == "RESOLVED"
    assert case.verdict_id == verdict_id
    assert verdict.applicability == "MATERIAL_VIOLATION"
    assert verdict.required_action == "QUARANTINE_AND_CREDIT"
    assert contract.get_agent_status("agent-alpha") == "QUARANTINED"
    assert contract.can_execute("agent-alpha") is False


def test_validator_replay_accepts_matching_access_verdict(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    contract = direct_deploy(CONTRACT_PATH)
    create_and_accept_agent(contract, direct_vm, direct_alice, direct_bob)
    open_access_case(contract, direct_vm, direct_charlie)
    mock_access_result(direct_vm, access_result("MATERIAL_VIOLATION"))

    contract.adjudicate_case("case-1")

    assert direct_vm.run_validator() is True


def test_validator_replay_rejects_changed_access_verdict(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    contract = direct_deploy(CONTRACT_PATH)
    create_and_accept_agent(contract, direct_vm, direct_alice, direct_bob)
    open_access_case(contract, direct_vm, direct_charlie)
    mock_access_result(direct_vm, access_result("MATERIAL_VIOLATION"))

    contract.adjudicate_case("case-1")
    malicious = access_result("COMPLIANT")

    assert direct_vm.run_validator(leader_result=malicious) is False


def test_compliant_keeps_agent_active(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    contract = direct_deploy(CONTRACT_PATH)
    create_and_accept_agent(contract, direct_vm, direct_alice, direct_bob)
    open_access_case(contract, direct_vm, direct_charlie)
    mock_access_result(direct_vm, access_result("COMPLIANT"))

    verdict_id = contract.adjudicate_case("case-1")

    verdict = contract.get_verdict(verdict_id)
    assert verdict.applicability == "COMPLIANT"
    assert contract.get_agent_status("agent-alpha") == "ACTIVE"
    assert contract.can_execute("agent-alpha") is True


def test_malformed_receipt_becomes_retryable_without_slashing(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    contract = direct_deploy(CONTRACT_PATH)
    create_and_accept_agent(contract, direct_vm, direct_alice, direct_bob)
    open_access_case(contract, direct_vm, direct_charlie)
    direct_vm.mock_web(
        r".*example\.com/robots\.txt\?v=1",
        {"method": "GET", "status": 200, "body": "User-agent: *\nDisallow: /private/"},
    )
    direct_vm.mock_web(
        r".*example\.com/policy/v1\.txt",
        {"method": "GET", "status": 200, "body": "Policy text."},
    )
    direct_vm.mock_web(
        r".*example\.com/receipts/event-1\.json",
        {"method": "GET", "status": 200, "body": "not json"},
    )

    verdict_id = contract.adjudicate_case("case-1")

    case = contract.get_case("case-1")
    verdict = contract.get_verdict(verdict_id)
    assert case.status == "RETRYABLE"
    assert verdict.applicability == "UNVERIFIABLE"
    assert verdict.attestation_verified is False
    assert contract.get_agent_status("agent-alpha") == "PENDING_REVIEW"
    assert contract.can_execute("agent-alpha") is False
