export interface MLModel {
  id: string
  name: string
  status: 'training' | 'ready' | 'failed'
  accuracy?: number
  type: 'classification' | 'regression' | 'anomaly_detection'
  algorithm?: 'Random Forest' | 'KNN' | 'Neural Network' | 'SVM' | 'Gradient Boosting' | 'Logistic Regression' | 'Decision Tree' | string
  variables?: string[]
  recordsProcessed: number
  createdAt: string
}
