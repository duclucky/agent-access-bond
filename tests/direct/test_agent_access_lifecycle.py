"""Direct-mode tests for AgentAccessBond lifecycle."""

import json

from tests.direct.conftest import to_hex


CONTRACT_PATH = "contracts/agent_access_bond.py"
OPERATOR_BOND = 500
PENALTY_AMOUNT = 100
CHALLENGE_BOND = 10
ROBOTS_URL = "https://example.com/robots.txt"
POLICY_URL = "https://example.com/agent-policy"
RECEIPT_URL = "https://example.com/receipts/case-1.json"


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
    contract.open_access_case(case_id, agent_id, target_url, receipt_url)
    contract_address = vm._contract_address
    current_balance = vm._balances.get(bytes(contract_address), 0)
    vm.deal(contract_address, current_balance + value)
    vm.value = 0


def mock_access_result(vm, result):
    vm.mock_web(
        r".*example\.com/robots\.txt",
        {
            "method": "GET",
            "status": 200,
            "body": "User-agent: AgentAccessBot\nDisallow: /private/",
        },
    )
    vm.mock_web(
        r".*example\.com/agent-policy",
        {
            "method": "GET",
            "status": 200,
            "body": "AgentAccessBot may only fetch public research pages.",
        },
    )
    vm.mock_web(
        r".*example\.com/receipts/case-1\.json",
        {
            "method": "GET",
            "status": 200,
            "body": json.dumps(
                {
                    "agent_id": "agent-alpha",
                    "case_id": "case-1",
                    "target_url": "https://example.com/private/report",
                    "user_agent": "AgentAccessBot/1.0",
                    "method": "GET",
                    "timestamp": "2026-07-27T00:00:00Z",
                }
            ),
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


def test_unverifiable_pauses_without_settlement_and_allows_retry(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    contract = direct_deploy(CONTRACT_PATH)
    create_and_accept_agent(contract, direct_vm, direct_alice, direct_bob)
    open_access_case(contract, direct_vm, direct_charlie)
    mock_access_result(direct_vm, access_result("UNVERIFIABLE"))

    verdict_id = contract.adjudicate_case("case-1")

    case = contract.get_case("case-1")
    verdict = contract.get_verdict(verdict_id)
    assert case.status == "RETRYABLE"
    assert verdict.applicability == "UNVERIFIABLE"
    assert contract.get_agent_status("agent-alpha") == "PENDING_REVIEW"
    assert contract.can_execute("agent-alpha") is False

    direct_vm.sender = direct_charlie
    contract.retry_case("case-1")
    retryable = contract.get_case("case-1")
    assert retryable.status == "OPEN"
