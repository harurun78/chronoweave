# Quickstart: Phase 3 Observation Trace Import

## Generic CSV Format

Chronoweave Phase 3 accepts a generic CSV trace format:

```csv
task,start_ms,end_ms
ISR_Timer,0,0.05
MotorCtrl_X,0.2,3.0
SensorFusion,0.4,5.9
ISR_Timer,1,1.05
MotorCtrl_X,10.2,13.1
SensorFusion,20.4,26.5
```

## Developer Flow

1. Start the app:

```bash
npm run dev
```

2. Use `Import Trace CSV` and select a fixture trace.

3. Confirm that the Observation panel lists observed task period and execution estimates.

4. Confirm Problems reports period drift, WCET overrun, missing observations, or extra observed tasks.

5. Run the validation gate:

```bash
npm run lint && npm run type-check && npm run test:run && npm run test:e2e && npm run format:check && npm run build && npm audit
```
