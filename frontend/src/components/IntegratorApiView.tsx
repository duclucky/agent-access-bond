import React, { useState } from 'react';
import { useContract } from '../context/ContractContext';

export const IntegratorApiView: React.FC = () => {
  const {
    get_agent,
    get_agent_status,
    can_execute,
    get_case,
    get_verdict,
    get_accounting,
    get_credit,
    contractAddress,
    wallet,
    agents,
  } = useContract();

  const [activeMethod, setActiveMethod] = useState<
    'can_execute' | 'get_agent' | 'get_agent_status' | 'get_case' | 'get_verdict' | 'get_accounting' | 'get_credit'
  >('can_execute');

  const [inputAgentId, setInputAgentId] = useState<string>('AGENT-8821');
  const [inputCaseId, setInputCaseId] = useState<string>('CASE-992');
  const [inputVerdictId, setInputVerdictId] = useState<string>('VERDICT-992');
  const [inputAddress, setInputAddress] = useState<string>(wallet.address);
  const [copied, setCopied] = useState(false);

  // Compute live test output
  let liveResult: any = null;
  if (activeMethod === 'can_execute') {
    liveResult = {
      method: "can_execute",
      agent_id: inputAgentId,
      can_execute: can_execute(inputAgentId),
      agent_status: get_agent_status(inputAgentId) || "NOT_FOUND"
    };
  } else if (activeMethod === 'get_agent') {
    liveResult = get_agent(inputAgentId) || { error: "Agent ID not found" };
  } else if (activeMethod === 'get_agent_status') {
    liveResult = {
      agent_id: inputAgentId,
      status: get_agent_status(inputAgentId) || "NOT_FOUND"
    };
  } else if (activeMethod === 'get_case') {
    liveResult = get_case(inputCaseId) || { error: "Case ID not found" };
  } else if (activeMethod === 'get_verdict') {
    liveResult = get_verdict(inputVerdictId) || { error: "Verdict ID not found" };
  } else if (activeMethod === 'get_accounting') {
    liveResult = get_accounting();
  } else if (activeMethod === 'get_credit') {
    liveResult = {
      address: inputAddress,
      creditGEN: get_credit(inputAddress)
    };
  }

  // Generate python snippet
  const pythonSnippet = `# GenLayer SDK Integration Example
from genlayer_py import GenLayerClient

client = GenLayerClient(endpoint="https://studionet.genlayer.com")
contract_address = "${contractAddress}"

# Query canonical read method
${
  activeMethod === 'can_execute'
    ? `is_allowed = client.read_contract(
    contract_address,
    "can_execute",
    ["${inputAgentId}"]
)
if is_allowed:
    print("Routing task to agent ${inputAgentId}")
else:
    print("Execution blocked by AgentAccessBond policy or quarantine")`
    : `result = client.read_contract(
    contract_address,
    "${activeMethod}",
    [${
      activeMethod === 'get_accounting' ? '' : `"${inputAgentId}"`
    }]
)`
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Header */}
      <header className="border-b border-slate-800 pb-4">
        <h2 className="font-headline text-2xl md:text-3xl font-black uppercase tracking-tighter text-white mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-orange-500 text-2xl">code</span>
          Canonical Read Interface for Integrators
        </h2>
        <p className="font-sans text-xs md:text-sm text-slate-400">
          External applications, API gateways, and orchestrators inspect AgentAccessBond view methods to dynamically decide whether to route tasks to an agent.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Method Selector & Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 glow-hover">
            <h3 className="font-headline text-base font-black uppercase text-white tracking-wider border-b border-slate-800 pb-2">
              Select Canonical Contract View Method
            </h3>

            <div className="space-y-2 font-mono text-xs">
              {[
                { id: 'can_execute', name: 'can_execute(agent_id)', desc: 'Boolean execution gate' },
                { id: 'get_agent', name: 'get_agent(agent_id)', desc: 'Full agent struct & parameters' },
                { id: 'get_agent_status', name: 'get_agent_status(agent_id)', desc: 'Current agent status enum' },
                { id: 'get_case', name: 'get_case(case_id)', desc: 'Challenge case details' },
                { id: 'get_verdict', name: 'get_verdict(verdict_id)', desc: 'Validator consensus verdict' },
                { id: 'get_credit', name: 'get_credit(address)', desc: 'Designated user claimable balance' },
                { id: 'get_accounting', name: 'get_accounting()', desc: 'Protocol-wide vault accounting' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMethod(m.id as any)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-0.5 ${
                    activeMethod === m.id
                      ? 'bg-orange-500/10 border-orange-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <span className={`font-bold ${activeMethod === m.id ? 'text-orange-400' : 'text-slate-200'}`}>
                    {m.name}
                  </span>
                  <span className="font-sans text-[11px] text-slate-500">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Input Parameters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 font-mono text-xs glow-hover">
            <h4 className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Query Parameters</h4>

            {(activeMethod === 'can_execute' || activeMethod === 'get_agent' || activeMethod === 'get_agent_status') && (
              <div>
                <label className="block text-slate-400 mb-1 font-bold">agent_id</label>
                <select
                  value={inputAgentId}
                  onChange={(e) => setInputAgentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-orange-500"
                >
                  {agents.map(a => (
                    <option key={a.agent_id} value={a.agent_id}>
                      {a.agent_id} ({a.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeMethod === 'get_case' && (
              <div>
                <label className="block text-slate-400 mb-1 font-bold">case_id</label>
                <input
                  type="text"
                  value={inputCaseId}
                  onChange={(e) => setInputCaseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            {activeMethod === 'get_verdict' && (
              <div>
                <label className="block text-slate-400 mb-1 font-bold">verdict_id</label>
                <input
                  type="text"
                  value={inputVerdictId}
                  onChange={(e) => setInputVerdictId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            {activeMethod === 'get_credit' && (
              <div>
                <label className="block text-slate-400 mb-1 font-bold">address</label>
                <input
                  type="text"
                  value={inputAddress}
                  onChange={(e) => setInputAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            {activeMethod === 'get_accounting' && (
              <p className="font-sans text-xs text-slate-500">No input arguments required for global accounting query.</p>
            )}
          </div>
        </div>

        {/* Right Column: Live Output & Code Snippet */}
        <div className="lg:col-span-7 space-y-4">
          {/* Live State Output */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 glow-hover">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 font-mono text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Live GenLayer Response Output
              </span>
              <span className="text-slate-500">Contract: {contractAddress.substring(0, 8)}...</span>
            </div>

            <pre className="bg-slate-900 p-4 rounded-xl border border-slate-800 font-mono text-xs text-orange-300 overflow-x-auto leading-relaxed max-h-80">
              {JSON.stringify(liveResult, null, 2)}
            </pre>
          </div>

          {/* Integration Code Snippet */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 glow-hover">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-mono text-xs text-white font-bold flex items-center gap-2 uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm text-orange-500">terminal</span>
                GenLayer Python / SDK Integration Snippet
              </h4>

              <button
                onClick={handleCopyCode}
                className="font-mono text-[11px] px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">
                  {copied ? 'done' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
              {pythonSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
