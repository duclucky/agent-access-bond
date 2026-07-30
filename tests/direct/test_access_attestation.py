"""Authenticated access-event and evidence-version tests."""

import json

from tests.direct.conftest import to_hex
from tests.direct.test_agent_access_lifecycle import (
    ATTESTOR_PUBLIC_KEY,
    CHALLENGE_BOND,
    EVENT_ID,
    OPERATOR_BOND,
    PENALTY_AMOUNT,
    POLICY_TEXT,
    POLICY_URL,
    RECEIPT_URL,
    ROBOTS_URL,
    access_result,
    content_hash,
    signed_receipt,
)


CONTRACT_PATH = "contracts/agent_access_bond.py"
ROBOTS_TEXT = "User-agent: AgentAccessBot\nDisallow: /private/"
TARGET_URL = "https://example.com/private/report"


def _setup_case(direct_deploy, vm, operator, user, opener, receipt=None):
    contract = direct_deploy(CONTRACT_PATH)
    vm.sender = operator
    vm.value = OPERATOR_BOND
    contract.create_agent(
        "agent-alpha",
        to_hex(user),
        "AgentAccessBot/1.0",
        "https://example.com",
        POLICY_URL,
        "research only",
        PENALTY_AMOUNT,
        CHALLENGE_BOND,
        ATTESTOR_PUBLIC_KEY,
    )
    vm.deal(
        vm._contract_address,
        vm._balances.get(bytes(vm._contract_address), 0) + OPERATOR_BOND,
    )
    vm.value = 0
    vm.sender = user
    contract.accept_agent("agent-alpha")

    vm.sender = opener
    vm.value = CHALLENGE_BOND
    contract.open_access_case(
        "case-1",
        "agent-alpha",
        EVENT_ID,
        TARGET_URL,
        RECEIPT_URL,
    )
    vm.deal(
        vm._contract_address,
        vm._balances.get(bytes(vm._contract_address), 0) + CHALLENGE_BOND,
    )
    vm.value = 0

    vm.mock_web(
        r".*example\.com/receipts/event-1\.json",
        {
            "method": "GET",
            "status": 200,
            "body": json.dumps(receipt or signed_receipt(ROBOTS_TEXT)),
        },
    )
    vm.mock_web(
        r".*example\.com/policy/v1\.txt",
        {"method": "GET", "status": 200, "body": POLICY_TEXT},
    )
    vm.mock_web(
        r".*example\.com/robots\.txt\?v=1",
        {"method": "GET", "status": 200, "body": ROBOTS_TEXT},
    )
    return contract


def _mock_material_violation(vm):
    vm.mock_llm(
        r"(?s).*AgentAccessBond adjudicator.*",
        json.dumps(access_result("MATERIAL_VIOLATION")),
    )


def test_signed_version_bound_event_can_slash(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    contract = _setup_case(
        direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie
    )
    _mock_material_violation(direct_vm)

    verdict_id = contract.adjudicate_case("case-1")

    verdict = contract.get_verdict(verdict_id)
    assert verdict.attestation_verified is True
    assert verdict.event_id == EVENT_ID
    assert verdict.occurred_at == "2026-07-30T10:00:00Z"
    assert verdict.policy_hash == content_hash(POLICY_TEXT)
    assert verdict.robots_hash == content_hash(ROBOTS_TEXT)
    assert verdict.applicability == "MATERIAL_VIOLATION"
    assert int(contract.get_credit(to_hex(direct_bob))) == PENALTY_AMOUNT
    assert contract.get_agent_case_ids("agent-alpha") == ["case-1"]


def test_tampered_signed_event_is_retryable_and_never_slashes(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    receipt = signed_receipt(ROBOTS_TEXT)
    receipt["method"] = "POST"
    contract = _setup_case(
        direct_deploy,
        direct_vm,
        direct_alice,
        direct_bob,
        direct_charlie,
        receipt,
    )

    verdict_id = contract.adjudicate_case("case-1")

    verdict = contract.get_verdict(verdict_id)
    assert verdict.attestation_verified is False
    assert verdict.applicability == "UNVERIFIABLE"
    assert contract.get_case("case-1").status == "RETRYABLE"
    assert int(contract.get_credit(to_hex(direct_bob))) == 0
    assert int(contract.get_accounting()["locked_operator_bonds"]) == OPERATOR_BOND


def test_version_hash_mismatch_is_retryable_and_never_slashes(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    receipt = signed_receipt(ROBOTS_TEXT, policy_hash="0x" + "22" * 32)
    contract = _setup_case(
        direct_deploy,
        direct_vm,
        direct_alice,
        direct_bob,
        direct_charlie,
        receipt,
    )

    verdict_id = contract.adjudicate_case("case-1")

    verdict = contract.get_verdict(verdict_id)
    assert verdict.attestation_verified is False
    assert verdict.applicability == "UNVERIFIABLE"
    assert int(contract.get_credit(to_hex(direct_bob))) == 0
    assert int(contract.get_accounting()["locked_operator_bonds"]) == OPERATOR_BOND


def test_event_id_cannot_be_reused_after_bilateral_cancel(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    contract = _setup_case(
        direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie
    )
    direct_vm.sender = direct_alice
    contract.propose_case_cancel("case-1")
    direct_vm.sender = direct_charlie
    contract.accept_case_cancel("case-1")

    direct_vm.value = CHALLENGE_BOND
    with direct_vm.expect_revert("Event already challenged"):
        contract.open_access_case(
            "case-2",
            "agent-alpha",
            EVENT_ID,
            TARGET_URL,
            RECEIPT_URL,
        )
