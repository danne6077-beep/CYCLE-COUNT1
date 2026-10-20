# Optional on-device rephrasing: decision note only

No LLM is implemented or downloaded. The current deterministic planner owns every product, quantity and price. An owner-approved future experiment could allow a local model to rephrase computed text, validating output against the original structured answer and rejecting changed facts.

Model size, download time, battery usage, thermal effects and device compatibility are **not measured**, because no model was selected or installed. They vary by model/quantization/hardware; no unsupported numeric estimate is presented as a measurement. A WebGPU/WASM model would add substantial downloads and memory pressure compared with the current worker. Offline execution prevents provider uploads but does not prevent invented wording or misleading implications. Exact numeric output validation alone would not catch every false claim.

Recommendation: retain deterministic answers. An optional model requires an explicit owner decision, a measured download/memory budget, cancellation and storage controls, a physical-device battery/thermal benchmark and a red-team evaluation. It must never generate or select prices, change plans, or issue basket mutations.


## Later owner decision

On 2026-10-20 the owner approved a separate opt-in online Smart mode. It does not implement this on-device proposal. Smart mode stays off by default and uses double verification; see [smart-mode.md](smart-mode.md). Earlier offline-only statements describe the baseline, while default offline behavior remains zero-network.
