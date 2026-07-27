"""AST checks for value-receiving public entrypoints."""

import ast
from pathlib import Path


CONTRACT = Path("contracts/agent_access_bond.py")
VALUE_METHODS = {"create_agent", "open_access_case"}


def _decorator_name(node):
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        parent = _decorator_name(node.value)
        return f"{parent}.{node.attr}" if parent else node.attr
    if isinstance(node, ast.Call):
        return _decorator_name(node.func)
    return ""


def test_value_receiving_entrypoints_are_payable():
    tree = ast.parse(CONTRACT.read_text(encoding="utf-8"))
    methods = {
        node.name: [_decorator_name(decorator) for decorator in node.decorator_list]
        for node in ast.walk(tree)
        if isinstance(node, ast.FunctionDef)
    }

    for name in VALUE_METHODS:
        assert "gl.public.write.payable" in methods[name]

