"""Direct-mode tests for AgentAccessBond accounting and close behavior."""

from tests.direct.conftest import to_hex
from tests.direct.test_agent_access_lifecycle import (
    CHALLENGE_BOND,
    OPERATOR_BOND,
    PENALTY_AMOUNT,
    access_result,
    create_and_accept_agent,
    mock_access_result,
    open_access_case,
)


CONTRACT_PATH = "contracts/agent_access_bond.py"


def setup_active_case(direct_deploy, vm, operator, user, opener):
    contract = direct_deploy(CONTRACT_PATH)
    create_and_accept_agent(contract, vm, operator, user)
    open_access_case(contract, vm, opener)
    return contract


def test_violation_credits_user_and_opener_once(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    contract = setup_active_case(
        direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie
    )
    mock_access_result(direct_vm, access_result("MATERIAL_VIOLATION"))

    contract.adjudicate_case("case-1")

    assert int(contract.get_credit(to_hex(direct_bob))) == PENALTY_AMOUNT
    assert int(contract.get_credit(to_hex(direct_charlie))) == CHALLENGE_BOND
    accounting = contract.get_accounting()
    assert int(accounting["locked_operator_bonds"]) == OPERATOR_BOND - PENALTY_AMOUNT
    assert int(accounting["locked_challenge_bonds"]) == 0
    assert int(accounting["withdrawable_credits"]) == PENALTY_AMOUNT + CHALLENGE_BOND

    with direct_vm.expect_revert("Case is not open"):
        contract.adjudicate_case("case-1")


def test_compliant_credits_challenge_bond_to_operator(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    contract = setup_active_case(
        direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie
    )
    mock_access_result(direct_vm, access_result("COMPLIANT"))

    contract.adjudicate_case("case-1")

    assert int(contract.get_credit(to_hex(direct_alice))) == CHALLENGE_BOND
    assert int(contract.get_credit(to_hex(direct_bob))) == 0


def test_withdraw_credit_debits_ledger_before_transfer(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
    direct_charlie,
):
    contract = setup_active_case(
        direct_deploy, direct_vm, direct_alice, direct_bob, direct_charlie
    )
    mock_access_result(direct_vm, access_result("MATERIAL_VIOLATION"))
    contract.adjudicate_case("case-1")

    direct_vm.sender = direct_bob
    contract.withdraw_credit(PENALTY_AMOUNT)

    assert int(contract.get_credit(to_hex(direct_bob))) == 0
    assert int(contract.get_accounting()["withdrawable_credits"]) == CHALLENGE_BOND
    with direct_vm.expect_revert("Insufficient credit"):
        contract.withdraw_credit(1)


def test_bilateral_close_returns_remaining_operator_bond(
    direct_vm,
    direct_deploy,
    direct_alice,
    direct_bob,
):
    contract = direct_deploy(CONTRACT_PATH)
    create_and_accept_agent(contract, direct_vm, direct_alice, direct_bob)

    direct_vm.sender = direct_alice
    contract.propose_close("agent-alpha")
    with direct_vm.expect_revert("Close requires the other party"):
        contract.accept_close("agent-alpha")

    direct_vm.sender = direct_bob
    contract.accept_close("agent-alpha")

    assert contract.get_agent_status("agent-alpha") == "CLOSED"
    assert int(contract.get_credit(to_hex(direct_alice))) == OPERATOR_BOND
    assert int(contract.get_accounting()["locked_operator_bonds"]) == 0

