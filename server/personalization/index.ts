/**
 * Personalized Protocol Matching System
 *
 * Main entry point for all personalization engines
 *
 * Patent Features Implemented:
 * - 1.1 Predictive Fall Risk Algorithm
 * - 1.2 Personalized Resistance Auto-Adjustment
 * - 1.3 Discharge Readiness Prediction
 * - 1.5 Multi-Modal Mobility Score Generation
 * - 3.2 Virtual Competition System
 * - 4.1 Fatigue-Triggered Auto-Resistance Reduction
 * - 4.2 Progressive Overload Auto-Scheduling
 * - 5.3 Insurance Authorization Support System
 * - 8.1 Cohort Performance Benchmarking
 * - 10.5 Setback Recovery Protocol
 * - 11.2 Medication Interaction Alert System
 * - 11.3 Contraindication Verification System
 * - 16.1 Hospital Mobility Score Generation
 *
 * Tier 2 Features (sensor-dependent, foundations ready):
 * - 2.1 Real-Time Bilateral Force Balancing
 * - 2.2 Stroke Rehabilitation Asymmetry Protocol
 * - 2.3 Neurological Deficit Early Detection
 * - 6.x Bilateral Force Visualization
 * - 15.3 Bilateral Resistance Balancing System
 */

// Core engines
export { personalizedProtocolMatcher, type PatientMatchProfile, type ProtocolMatch } from './personalized-protocol-matcher';
export { fatigueDetectionEngine, type RealTimeMetric } from './fatigue-detection-engine';
export { progressiveOverloadEngine } from './progressive-overload-engine';
export { medicationSafetyEngine } from './medication-safety-engine';
export { mobilityScoringEngine } from './mobility-scoring-engine';
export { competitionEngine } from './competition-engine';
export { insuranceReportEngine } from './insurance-report-engine';

// Tier 2 foundations
export { bilateralForceEngine } from './bilateral-force-engine';

// Types
export * from './types';
