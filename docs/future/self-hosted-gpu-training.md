# Future Feature: Self-Hosted GPU Training

## Overview

Allow users to connect their own cloud infrastructure (DigitalOcean, AWS, GCP, etc.) for fine-tuning jobs instead of using managed API providers. This gives power users more control and potentially lower costs for large training runs.

## Two-Tier Provider System

| Approach | Best For | Control Level | Setup |
|----------|----------|---------------|-------|
| **Managed APIs** (Together AI, Fireworks) | Quick start, beginners | Low - just API key | Instant |
| **Self-hosted GPU** (DigitalOcean, etc.) | Power users, cost control | High - full SSH access | Requires droplet setup |

## Benefits

### Managed APIs (Current)
- One-click setup, no infrastructure
- Pay-per-use pricing
- Works immediately with API key
- Provider handles scaling, queuing, failures

### Self-Hosted (Future)
- Cheaper for large training jobs (hourly GPU vs per-token)
- Full control over training scripts and frameworks
- Can use any model (not limited to provider's model list)
- Persistent storage for checkpoints
- Custom dependencies and configurations

## Implementation Reference: Corch Training Studio

The `corch_by_fac` project had a working implementation of SSH-based GPU training:

### Key Components
1. **Cloud account connection** - User links DO/AWS/GCP account
2. **GPU instance provisioning** - Spin up droplet on-demand
3. **SSH tunnel** - Connect to instance, run training scripts
4. **Log streaming** - SSE real-time metrics back to UI
5. **Teardown** - Option to keep or destroy instance after training

### Architecture Pattern
```
ChatMLE UI → Backend Server → SSH → Cloud GPU Instance
                ↑                         ↓
            Log streaming          Training script
```

## Potential Cloud Providers

| Provider | GPU Options | Min Cost | API Quality |
|----------|-------------|----------|-------------|
| DigitalOcean | H100, A100 | ~$2/hr | Good REST API |
| AWS | Various | ~$1-3/hr | Complex but comprehensive |
| GCP | T4, A100 | ~$1-4/hr | Good, but auth complex |
| Lambda Labs | A10, A100 | ~$1-2/hr | Simple API |
| Vast.ai | Various | ~$0.50/hr | Marketplace model |

## UI/UX Considerations

- Should be clearly marked as "Advanced" or "Power User" option
- Guided setup flow for connecting cloud account
- Clear cost estimates before provisioning
- Option to keep instance running between jobs
- SSH key management (generate or use existing)

## Dependencies

- SSH library (node-ssh or similar)
- Cloud provider SDKs (optional, can use REST APIs)
- Training script templates for different frameworks
- Log parsing for different training outputs (transformers, axolotl, etc.)

## Priority

Low - This is a nice-to-have feature for power users. The managed API approach (Together AI, Fireworks) covers 90% of use cases with much simpler UX.

## Related

- See `corch_by_fac` Training Studio implementation for reference code
- Modal and Replicate were considered but have SDK-only approaches (no REST API for training)
