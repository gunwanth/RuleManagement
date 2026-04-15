import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, Database, Cpu, Activity, ChevronRight, BarChart3, Fingerprint, Lock, Plus } from 'lucide-react'
import type { MLModel } from '../ml/types'

interface Props {
  models: MLModel[]
  setModels: React.Dispatch<React.SetStateAction<MLModel[]>>
  onOpenMetrics?: (modelId: string) => void
}

export function MachineLearningHub({ models, setModels, onOpenMetrics }: Props) {
  const [isUploading, setIsUploading] = useState(false)
  
  // Mock generation state
  const [showMockModal, setShowMockModal] = useState(false)
  const [mockName, setMockName] = useState('')
  const [mockRows, setMockRows] = useState(1000)
  const [mockFeatures, setMockFeatures] = useState('Amount, Location, Time, Category')
  const [mockAlgorithm, setMockAlgorithm] = useState('Random Forest')
  const [uploadAlgorithm, setUploadAlgorithm] = useState('Random Forest')
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    
    // Simulate Parsing
    await new Promise(r => setTimeout(r, 1500))
    setIsUploading(false)
    
    const newId = crypto.randomUUID()
    const newModel: MLModel = {
      id: newId,
      name: `${file.name.replace('.csv', '')} Model Explorer`,
      status: 'training',
      type: 'classification',
      algorithm: uploadAlgorithm,
      variables: ['Col1', 'Col2', 'Col3', 'Col4'],
      recordsProcessed: Math.floor(Math.random() * 50000) + 10000,
      createdAt: new Date().toISOString()
    }
    
    setModels(prev => [newModel, ...prev])
    
    // Simulate Training
    await new Promise(r => setTimeout(r, 4000))
    setModels(prev => prev.map(m => 
      m.id === newId ? { ...m, status: 'ready', accuracy: 85 + Math.random() * 10 } : m
    ))
  }

  const handleMockGenerate = async () => {
    setShowMockModal(false)
    if (!mockName) return

    const newId = crypto.randomUUID()
    const newModel: MLModel = {
      id: newId,
      name: mockName,
      status: 'training',
      type: 'anomaly_detection',
      algorithm: mockAlgorithm,
      variables: mockFeatures.split(',').map(s => s.trim()).filter(Boolean),
      recordsProcessed: mockRows,
      createdAt: new Date().toISOString()
    }
    
    setModels(prev => [newModel, ...prev])
    
    // Simulate Training
    await new Promise(r => setTimeout(r, 3000))
    setModels(prev => prev.map(m => 
      m.id === newId ? { ...m, status: 'ready', accuracy: 91 + Math.random() * 6 } : m
    ))
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Gradients */}
      <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-violet-600/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-fuchsia-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="flex-none p-6 pb-4 border-b border-white/10 z-10 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-2">
            <Database className="w-6 h-6 text-violet-400" />
            Machine Learning & Datasets
          </h1>
          <p className="text-slate-400 text-sm mt-1">Upload datasets, capsulate data, and train models for the Rule Engine.</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Upload & Agent Tools */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 z-0" />
             <div className="relative z-10 flex flex-col items-center justify-center text-center">
               <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg border border-slate-700">
                 <UploadCloud className="w-8 h-8 text-violet-400" />
               </div>
               <h3 className="text-base font-bold text-slate-200 mb-2">Upload Dataset</h3>
               <p className="text-xs text-slate-400 mb-4 px-4">
                 Drag & drop a CSV or JSON file here. Select your desired ML model to analyze the data.
               </p>
               
               <div className="w-full px-4 mb-6">
                 <label className="block text-left text-xs font-semibold text-slate-300 uppercase mb-1">Select Algorithm</label>
                 <select 
                   value={uploadAlgorithm}
                   onChange={e => setUploadAlgorithm(e.target.value)}
                   className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                 >
                   <option value="Random Forest">Random Forest</option>
                   <option value="KNN">KNN</option>
                   <option value="Neural Network">Neural Network</option>
                   <option value="SVM">SVM</option>
                   <option value="Gradient Boosting">Gradient Boosting</option>
                   <option value="Logistic Regression">Logistic Regression</option>
                   <option value="Decision Tree">Decision Tree</option>
                 </select>
               </div>

               <input 
                 type="file" 
                 accept=".csv,.json" 
                 className="hidden" 
                 ref={fileInputRef}
                 onChange={(e) => {
                   if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
                 }}
               />
               
               <div className="flex w-full gap-2">
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   disabled={isUploading}
                   className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm"
                 >
                   {isUploading ? 'Analyzing...' : 'Select File'}
                 </button>
                 <button 
                   onClick={() => setShowMockModal(true)}
                   className="flex-[0.8] bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                 >
                   <Plus className="w-4 h-4" /> Create Mock
                 </button>
               </div>
             </div>
          </div>

          {/* Capabilities/Agent Map */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">ML Agents Available</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-xl border border-white/5">
                 <div className="bg-violet-500/20 p-2 rounded-lg text-violet-400">
                   <Fingerprint className="w-4 h-4" />
                 </div>
                 <div>
                   <div className="text-sm font-semibold text-slate-200">Data Capsulation</div>
                   <div className="text-xs text-slate-500">Extracts hidden patterns automatically</div>
                 </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-xl border border-white/5">
                 <div className="bg-fuchsia-500/20 p-2 rounded-lg text-fuchsia-400">
                   <BarChart3 className="w-4 h-4" />
                 </div>
                 <div>
                   <div className="text-sm font-semibold text-slate-200">Metrics Agent</div>
                   <div className="text-xs text-slate-500">Calculates deep risk scorings</div>
                 </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Col: Registry */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
               <Cpu className="w-4 h-4 text-slate-400" /> Model Registry
            </h2>
          </div>

          <div className="grid gap-4">
            <AnimatePresence>
              {models.map(model => (
                <motion.div 
                  key={model.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-xl p-5 flex items-center justify-between shadow-lg"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${model.status === 'training' ? 'bg-amber-500/20 text-amber-500 animate-pulse' : 'bg-violet-500/20 text-violet-400'}`}>
                      {model.status === 'training' ? <Activity className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                         {model.name}
                         {model.status === 'training' && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded uppercase tracking-wide">Training</span>}
                         {model.status === 'ready' && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded uppercase tracking-wide">Active</span>}
                      </h3>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                         <span>{model.algorithm || 'Auto'} ({model.type.replace('_', ' ').toUpperCase()})</span>
                         <span>&bull;</span>
                         <span>{model.recordsProcessed.toLocaleString()} records</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {model.status === 'ready' && model.accuracy && (
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-200">{model.accuracy.toFixed(1)}<span className="text-sm font-normal text-slate-400">%</span></div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide">Accuracy</div>
                      </div>
                    )}
                    {model.status === 'training' && (
                       <div className="flex gap-1 items-center">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"></div>
                       </div>
                    )}
                    <button 
                      onClick={() => onOpenMetrics?.(model.id)}
                      className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {showMockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-white mb-1">Create Mock Dataset</h2>
            <p className="text-sm text-slate-400 mb-6">Assign an ML dataset for the Rule Engine with custom columns.</p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Dataset Name</label>
                <input 
                  type="text" 
                  value={mockName}
                  onChange={e => setMockName(e.target.value)}
                  placeholder="e.g. Synthetic Fraud Data"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Number of Rows</label>
                <input 
                  type="number" 
                  value={mockRows}
                  onChange={e => setMockRows(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Algorithm</label>
                <select 
                  value={mockAlgorithm}
                  onChange={e => setMockAlgorithm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="Random Forest">Random Forest</option>
                  <option value="KNN">KNN</option>
                  <option value="Neural Network">Neural Network</option>
                  <option value="SVM">SVM</option>
                  <option value="Gradient Boosting">Gradient Boosting</option>
                  <option value="Logistic Regression">Logistic Regression</option>
                  <option value="Decision Tree">Decision Tree</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Columns / Features (comma separated)</label>
                <textarea 
                  value={mockFeatures}
                  onChange={e => setMockFeatures(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500 resize-none h-20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowMockModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
               >
                Cancel
              </button>
              <button 
                onClick={handleMockGenerate}
                disabled={!mockName}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 text-white transition-colors"
               >
                Generate Mock Model
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
