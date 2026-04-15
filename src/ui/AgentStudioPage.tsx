import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, CheckCircle2, ChevronRight, BrainCircuit, Database, Cpu, Activity, RefreshCw, PauseCircle, Network } from 'lucide-react'
import type { Ticket } from '../agent/engine'
import { generateWorkflowFromText, resumeWorkflowFromText } from '../agent/engine'
import type { RuleRecord } from '../rules/types'
import type { MLModel } from '../ml/types'
import ReactFlow, { Background, Controls } from 'reactflow'
import 'reactflow/dist/style.css'

interface AgentStudioPageProps {
  mlModels?: MLModel[];
  onRuleCreated: (rule: RuleRecord) => void;
  onOpenRule: (id: string) => void;
}

const steps = [
  { status: 'pending', label: 'Idle', icon: BrainCircuit },
  { status: 'gathering_context', label: 'RAG Agent', icon: Database },
  { status: 'generating_rules', label: 'Rule Engine', icon: Cpu },
  { status: 'paused_for_review', label: 'Human Review', icon: PauseCircle },
  { status: 'executing', label: 'Execution', icon: Activity },
  { status: 'completed', label: 'Deployed', icon: CheckCircle2 }
]

const AGENT_LIBRARY = [
  { id: 'rule-builder', name: 'Rule Architect', desc: 'Builds core AST node logic.', icon: Cpu, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  { id: 'integrations', name: 'Integration Agent', desc: 'Resolves add-on API hooks.', icon: Network, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/20' },
  { id: 'ml-understanding', name: 'Data ML Agent', desc: 'Models data and fraud vectors.', icon: Database, color: 'text-rose-400', bg: 'bg-rose-500/20' },
  { id: 'metrics', name: 'Metrics Agent', desc: 'Generates cost & risk logic.', icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/20' }
]

export function AgentStudioPage({ mlModels, onRuleCreated, onOpenRule }: AgentStudioPageProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('')
  const [additionPrompt, setAdditionPrompt] = useState('')
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const [generatedRule, setGeneratedRule] = useState<RuleRecord | null>(null)
  
  const pushLog = (log: string) => {
    setActiveTicket(prev => prev ? { ...prev, logs: [...prev.logs, log] } : null)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    // Check if model selected
    const selectedModel = mlModels?.find(m => m.id === selectedModelId)
    const selectedAgent = AGENT_LIBRARY.find(a => a.id === selectedAgentId)
    const enhancedPrompt = selectedModel ? `Using Preprocessed Dataset & ML Model Context: [${selectedModel.name} - ${selectedModel.algorithm || selectedModel.type}]. ${prompt}` : prompt;

    const newTicket: Ticket = {
      id: crypto.randomUUID(),
      prompt: enhancedPrompt,
      status: 'gathering_context',
      createdAt: new Date().toISOString(),
      logs: []
    }
    setActiveTicket(newTicket)
    setGeneratedRule(null)

    // Step 1: Gathering Context
    pushLog(`[System] Ticket ${newTicket.id.split('-')[0]} initialized...`)
    if (selectedModel) {
      pushLog(`[System] Attached Data Context for model: ${selectedModel.name}`)
    }
    const rule = await generateWorkflowFromText(enhancedPrompt, pushLog, selectedAgent?.name, selectedAlgorithm)
    
    setActiveTicket(prev => prev ? { ...prev, status: 'generating_rules' } : null)
    await new Promise(r => setTimeout(r, 600))
    
    setGeneratedRule(rule)

    // Pause for Human In The Loop Review
    pushLog(`[System] Rule Draft generated. Awaiting Human Review (HITL).`)
    setActiveTicket(prev => prev ? { ...prev, status: 'paused_for_review' } : null)
  }

  const handleResume = async () => {
    if (!activeTicket || !generatedRule) return;

    setActiveTicket(prev => prev ? { ...prev, status: 'generating_rules' } : null)
    
    let finalRule = generatedRule
    if (additionPrompt.trim()) {
      pushLog(`[System] Human Review requested changes. Orchestrating sub-agents...`)
      finalRule = await resumeWorkflowFromText(additionPrompt, generatedRule, pushLog)
      setGeneratedRule(finalRule)
      setAdditionPrompt('') // Clear so they can append again!
      
      // Pause again after generating the addition
      pushLog(`[System] Rule Draft updated. Awaiting further Review or Execution.`)
      setActiveTicket(prev => prev ? { ...prev, status: 'paused_for_review' } : null)
      return;
    } else {
      pushLog(`[System] Workflow approved by Human Reviewer. Proceeding to deploy.`)
    }

    setActiveTicket(prev => prev ? { ...prev, status: 'executing' } : null)
    await new Promise(r => setTimeout(r, 800))
    
    setActiveTicket(prev => prev ? { ...prev, status: 'completed', generatedRuleId: finalRule.id } : null)
    onRuleCreated(finalRule)
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Header */}
      <header className="flex-none p-6 pb-2 border-b border-white/10 z-10">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Agent Studio & Hive
        </h1>
        <p className="text-slate-400 text-sm mt-1">Prompt-to-System orchestrated by intelligent specialized agents.</p>
      </header>

      {/* Content Layout */}
      <div className="flex-1 flex gap-6 p-6 z-10 overflow-hidden">
        {/* Left Col: Prompt, Ticket Tracking & Agent Library */}
        <div className="w-[420px] flex flex-col gap-6 overflow-y-auto pr-2 pb-4">
          
          {/* Prompt / Review Entry */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 shrink-0">
            {activeTicket?.status === 'paused_for_review' ? (
              <>
                <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <PauseCircle className="w-4 h-4" />
                  Human Review & Deep Build
                </h2>
                <div className="text-xs text-slate-400">
                  The current workflow architecture is ready for review. Agents can add specific logic layers continuously. Add requirements to trigger agent build, or leave empty to deploy.
                </div>
                <textarea 
                   value={additionPrompt}
                   onChange={e => setAdditionPrompt(e.target.value)}
                   placeholder="e.g. 'Integrate risk ML model score checking before rejecting.'"
                   className="w-full h-24 bg-slate-950 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none"
                />
                <button
                   onClick={handleResume}
                   className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {additionPrompt.trim() ? <Database className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {additionPrompt.trim() ? 'Add Requirement & Re-run Agents' : 'Approve & Deploy Pipeline'}
                </button>
              </>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-indigo-400" />
                  Intelligence Prompt
                </h2>

                {/* ML Model Selector */}
                {mlModels && mlModels.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Assign Preprocessed Dataset (Optional)</label>
                    <select 
                      value={selectedModelId}
                      onChange={e => setSelectedModelId(e.target.value)}
                      disabled={activeTicket !== null && activeTicket.status !== 'completed' && activeTicket.status !== 'failed'}
                      className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                    >
                      <option value="">-- No specific dataset --</option>
                      {mlModels.filter(m => m.status === 'ready').map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.algorithm || m.type})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ML Algorithm Selector */}
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Select ML Algorithm (Optional)</label>
                  <select 
                    value={selectedAlgorithm}
                    onChange={e => setSelectedAlgorithm(e.target.value)}
                    disabled={activeTicket !== null && activeTicket.status !== 'completed' && activeTicket.status !== 'failed'}
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="">-- Auto-Pick Algorithm --</option>
                    <option value="Random Forest">Random Forest</option>
                    <option value="KNN">KNN</option>
                    <option value="Neural Network">Neural Network</option>
                    <option value="SVM">SVM</option>
                    <option value="Gradient Boosting">Gradient Boosting</option>
                    <option value="Logistic Regression">Logistic Regression</option>
                    <option value="Decision Tree">Decision Tree</option>
                  </select>
                </div>

                {/* Agent Selector */}
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Assign Executing Agent</label>
                  <select 
                    value={selectedAgentId}
                    onChange={e => setSelectedAgentId(e.target.value)}
                    disabled={activeTicket !== null && activeTicket.status !== 'completed' && activeTicket.status !== 'failed'}
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="">-- Auto-Assign Suitable Agent --</option>
                    {AGENT_LIBRARY.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>

                <textarea 
                   value={prompt}
                   onChange={e => setPrompt(e.target.value)}
                   disabled={activeTicket !== null && activeTicket.status !== 'completed' && activeTicket.status !== 'failed'}
                   placeholder="Describe the rule workflow (e.g., 'Create a dynamic loan approval flow with fraud detection')"
                   className="w-full h-24 bg-slate-950 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none disabled:opacity-50 mt-2"
                />
                <button
                   onClick={handleGenerate}
                   disabled={activeTicket?.status !== undefined && activeTicket?.status !== 'completed' && activeTicket?.status !== 'failed'}
                   className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-500"
                >
                  <Play className="w-4 h-4" /> {activeTicket?.status === 'completed' ? 'Generate New Workflow' : 'Generate Workflow'}
                </button>
              </>
            )}
          </div>

          {/* Ticket / Agents Status */}
          <AnimatePresence>
            {activeTicket && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col shrink-0"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Agent Pipeline</h2>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded uppercase tracking-wide font-mono">
                    ID: {activeTicket.id.split('-')[0]}
                  </span>
                </div>

                {/* Steps */}
                <div className="flex flex-col gap-3 mb-4">
                  {steps.map((step, idx) => {
                    const statusOrder = steps.findIndex(s => s.status === activeTicket.status)
                    const isPast = statusOrder > idx || activeTicket.status === 'completed'
                    const isCurrent = step.status === activeTicket.status && activeTicket.status !== 'completed' && step.status !== 'pending'
                    const Icon = step.icon
                    return (
                       <div key={idx} className="flex items-center gap-3">
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isPast ? 'bg-indigo-500 text-white' : isCurrent ? (step.status === 'paused_for_review' ? 'bg-amber-500 text-white shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-indigo-500/20 text-indigo-400 animate-pulse border border-indigo-400/50') : 'bg-slate-800 text-slate-500'}`}>
                            <Icon className="w-3 h-3" />
                         </div>
                         <div className={`text-xs font-medium ${isPast || isCurrent ? (isCurrent && step.status === 'paused_for_review' ? 'text-amber-400 font-bold' : 'text-slate-200') : 'text-slate-600'}`}>
                            {step.label} {isCurrent && step.status !== 'paused_for_review' && <span className="text-indigo-400 ml-1">...</span>}
                         </div>
                       </div>
                    )
                  })}
                </div>

                {/* Logs terminal */}
                <div className="h-[120px] bg-black/50 border border-slate-800 rounded-lg p-2 font-mono text-[10px] text-green-400 overflow-y-auto">
                   {activeTicket.logs.map((L, i) => (
                      <motion.div 
                         initial={{ opacity: 0, x: -10 }} 
                         animate={{ opacity: 1, x: 0 }} 
                         key={i} 
                         className="mb-1 leading-tight"
                      >
                         <span className="text-slate-500 mr-2">{'>'}</span>{L}
                      </motion.div>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Agent Library */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shrink-0 mt-auto">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Available Agents</h3>
             <div className="flex flex-col gap-2">
               {AGENT_LIBRARY.map(agent => (
                 <div key={agent.id} className="flex items-start gap-3 bg-white/5 p-2 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                   <div className={`${agent.bg} ${agent.color} p-1.5 rounded-md`}>
                     <agent.icon className="w-4 h-4" />
                   </div>
                   <div>
                     <div className="text-[11px] font-bold text-slate-200">{agent.name}</div>
                     <div className="text-[10px] text-slate-500 leading-tight">{agent.desc}</div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Right Col: Viz & Rule Details */}
        <div className="flex-1 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden flex flex-col relative shadow-xl">
          {!generatedRule && activeTicket?.status !== 'completed' && activeTicket?.status !== 'paused_for_review' && (
             <div className="absolute inset-0 flex items-center justify-center bg-transparent backdrop-blur-[2px] z-20">
                <div className="text-slate-500 flex flex-col items-center gap-3">
                   {activeTicket ? (
                     <>
                       <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                       <p className="font-medium animate-pulse">Orchestrating Agents...</p>
                     </>
                   ) : (
                     <>
                       <Database className="w-12 h-12 opacity-20" />
                       <p>Enter a prompt to generate a workflow architecture.</p>
                     </>
                   )}
                </div>
             </div>
          )}

          {generatedRule && (
            <>
              {/* Toolbar */}
              <div className="h-14 border-b border-white/10 bg-slate-950/50 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-sm font-medium text-slate-200">{generatedRule.name}</span>
                </div>
                {activeTicket?.status === 'completed' && (
                  <button 
                    onClick={() => onOpenRule(generatedRule.id)}
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    Open in Builder <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* ReactFlow Canvas */}
              <div className="flex-1 bg-slate-950 relative">
                 <ReactFlow 
                   nodes={generatedRule.workflow.nodes.map(n => ({
                      ...n,
                      data: {
                        ...n.data,
                        label: (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <div className="font-bold whitespace-nowrap">{n.data.title}</div>
                            {n.data.generatedBy && (
                              <div className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                                Agent: {n.data.generatedBy}
                              </div>
                            )}
                          </div>
                        )
                      },
                      style: { 
                         background: 'rgba(30, 41, 59, 0.9)', 
                         color: '#f8fafc',
                         border: '1px solid rgba(99, 102, 241, 0.4)',
                         borderRadius: '8px',
                         padding: '10px',
                         minWidth: 170,
                         textAlign: 'center',
                         boxShadow: '0 4px 10px -1px rgba(0, 0, 0, 0.5)'
                      }
                   }))} 
                   edges={generatedRule.workflow.edges.map(e => ({
                      ...e, 
                      animated: true,
                      style: { stroke: '#6366f1', strokeWidth: 2 }
                   }))} 
                   fitView
                   proOptions={{ hideAttribution: true }}
                 >
                    <Background color="#334155" gap={16} size={1} />
                    <Controls />
                 </ReactFlow>

                 {/* Floating code / rule panel */}
                 {activeTicket?.status === 'completed' && (
                   <motion.div 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.5 }}
                     className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-4 shadow-2xl max-h-[30vh] overflow-y-auto"
                   >
                     <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                        <div className="text-xs font-semibold text-slate-400 uppercase">Generated Code Artifacts</div>
                        <div className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">Auto-Generated</div>
                     </div>
                     {generatedRule.functions.map(f => (
                       <div key={f.id} className="mb-4 last:mb-0">
                         <div className="text-xs text-indigo-300 mb-1 font-mono">{'//'} {f.name}</div>
                         <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap bg-black/30 p-2 rounded border border-slate-800">
                           Operation: {f.operation}
                         </pre>
                       </div>
                     ))}
                   </motion.div>
                 )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
