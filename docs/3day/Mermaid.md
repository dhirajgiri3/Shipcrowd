```mermaid
graph TD
    %% Day 1 - Backend Agent (Purple)
    T1.1[T1.1: Order Controller<br/>90 min | Backend]:::backend
    T1.2[T1.2: Shipment Controller<br/>90 min | Backend]:::backend
    T1.3[T1.3: Register Routes<br/>30 min | Backend]:::backend
    T1.4[T1.4: Analytics Endpoints<br/>90 min | Backend]:::backend
    T1.5[T1.5: RateCard Controller<br/>90 min | Backend]:::backend
    T1.6[T1.6: Zone Management<br/>60 min | Backend]:::backend
    T1.7[T1.7: API Contract Gen<br/>30 min | Backend]:::backend
    
    %% Day 1 - Frontend Agent (Blue)
    T2.1[T2.1: API Client Infra<br/>90 min | Frontend]:::frontend
    T2.2[T2.2: RQ Hooks - Orders<br/>30 min | Frontend]:::frontend
    T2.3[T2.3: RQ Hooks - Shipments<br/>30 min | Frontend]:::frontend
    T2.4[T2.4: RQ Hooks - Analytics<br/>30 min | Frontend]:::frontend
    
    %% Day 2 - Frontend Agent (Blue)
    T2.5[T2.5: Seller Dashboard<br/>90 min | Frontend]:::frontend
    T2.6[T2.6: Orders Page<br/>90 min | Frontend]:::frontend
    T2.7[T2.7: Shipments Page<br/>90 min | Frontend]:::frontend
    T2.8[T2.8: Warehouse Page<br/>60 min | Frontend]:::frontend
    T2.9[T2.9: Rate Cards Page<br/>60 min | Frontend]:::frontend
    T2.10[T2.10: Admin Dashboard<br/>60 min | Frontend]:::frontend
    T2.11[T2.11: UI/UX Polish<br/>90 min | Frontend]:::frontend
    
    %% Day 3 - Seed Agent (Green)
    T3.1[T3.1: Seed Core Entities<br/>60 min | Seed]:::seed
    T3.2[T3.2: Seed Orders/Products<br/>60 min | Seed]:::seed
    T3.3[T3.3: Seed Shipments<br/>60 min | Seed]:::seed
    T3.4[T3.4: Seed Zones/RateCards<br/>30 min | Seed]:::seed
    
    %% Day 3 - QA Agent (Orange)
    T3.5[T3.5: Integration Testing<br/>60 min | QA]:::qa
    T3.6[T3.6: Performance Opt<br/>60 min | Backend]:::backend
    T3.7[T3.7: Demo Script Prep<br/>60 min | QA]:::qa
    T3.8[T3.8: Final QA & Fixes<br/>90 min | QA]:::qa
    
    %% Backend Dependencies
    T1.1 --> T1.3
    T1.2 --> T1.3
    T1.1 --> T1.7
    T1.2 --> T1.7
    T1.4 --> T1.7
    T1.5 --> T1.7
    T1.6 --> T1.7
    
    %% Frontend Dependencies (Day 1)
    T1.7 -.->|API Contract| T2.1
    T2.1 --> T2.2
    T2.1 --> T2.3
    T2.1 --> T2.4
    
    %% Frontend Dependencies (Day 2)
    T2.4 --> T2.5
    T1.4 -.->|Analytics API| T2.5
    T2.2 --> T2.6
    T1.1 -.->|Order API| T2.6
    T2.3 --> T2.7
    T1.2 -.->|Shipment API| T2.7
    T2.4 --> T2.8
    T2.4 --> T2.9
    T1.5 -.->|RateCard API| T2.9
    T2.4 --> T2.10
    T1.4 -.->|Admin API| T2.10
    
    T2.5 --> T2.11
    T2.6 --> T2.11
    T2.7 --> T2.11
    T2.8 --> T2.11
    T2.9 --> T2.11
    T2.10 --> T2.11
    
    %% Seed Dependencies (Day 3)
    T1.3 -.->|Phase Boundary| T3.1
    T1.7 -.->|Models Ready| T3.1
    T3.1 --> T3.2
    T3.2 --> T3.3
    T3.1 --> T3.4
    
    %% QA Dependencies (Day 3)
    T3.3 --> T3.5
    T3.4 --> T3.5
    T2.11 --> T3.5
    T3.5 --> T3.6
    T3.5 --> T3.7
    T3.6 --> T3.8
    T3.7 --> T3.8
    
    %% Critical Path Highlighting
    classDef critical stroke:#ff0000,stroke-width:3px
    classDef backend fill:#9370DB,color:#fff
    classDef frontend fill:#4169E1,color:#fff
    classDef seed fill:#32CD32,color:#fff
    classDef qa fill:#FF8C00,color:#fff
    
    class T1.2,T1.3,T1.7,T2.1,T2.3,T2.7,T2.11,T3.3,T3.5,T3.8 critical
```

## Legend
- **Purple**: Backend Agent tasks
- **Blue**: Frontend Agent tasks
- **Green**: Seed Agent tasks
- **Orange**: QA Agent tasks
- **Red Border**: Critical Path (10 hours total)
- **Solid Arrows**: Direct dependencies
- **Dashed Arrows**: Cross-agent dependencies or phase boundaries

## Critical Path Analysis
**Total Duration**: 10 hours (vs 26 hours sequential)
**Parallelization Factor**: 2.6x speedup

**Critical Path Tasks**:
1. T1.2: Shipment Controller (90 min) - Day 1
2. T1.3: Register Routes (30 min) - Day 1
3. T1.7: API Contract Gen (30 min) - Day 1
4. T2.1: API Client (90 min) - Day 1
5. T2.3: RQ Hooks Shipments (30 min) - Day 1
6. T2.7: Connect Shipments Page (90 min) - Day 2
7. T2.11: UI/UX Polish (90 min) - Day 3
8. T3.3: Seed Shipments (60 min) - Day 3
9. T3.5: Integration Testing (60 min) - Day 3
10. T3.8: Final QA (90 min) - Day 3

## Bottleneck Analysis
**Day 1 Bottleneck**: T1.7 (API Contract Generation) blocks Frontend agent
- **Mitigation**: Backend agent completes all controllers by 5 PM; Frontend starts T2.1 at 1:30 PM

**Day 3 Bottleneck**: T3.5 (Integration Testing) waits for both Seed + Frontend completion
- **Mitigation**: Seed agent (T3.1-T3.4) runs 9 AM - 12:30 PM; Frontend T2.11 runs 9 AM - 10:30 AM; QA starts at 1 PM with 30-min buffer

## Phase Boundaries
**Phase 1 → Phase 2**: Backend T1.7 complete by 5:30 PM Day 1
**Phase 2 → Phase 3**: Frontend T2.10 complete by 5:30 PM Day 2