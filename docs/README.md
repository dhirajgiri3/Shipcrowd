# Helix Documentation

Welcome to the Helix documentation! This directory contains all project, development, technical, and design documentation organized in a deep hierarchical structure.

## 📚 Navigation

### [1_Project/](./1_Project/) - Project Management
High-level project information, features, and collaboration guidelines
- **[Overview/](./1_Project/Overview/)** - Feature lists and project analysis
- **[Handover/](./1_Project/Handover/)** - Handover documentation
- **[AI_Collaboration/](./1_Project/AI_Collaboration/)** - AI collaboration playbook

### [2_Development/](./2_Development/) - Development Documentation
Complete development context, planning, audits, and methodology
- **[Domains/](./2_Development/Domains/)** - Business domain documentation
  - Auth, Orders, Payments, Shipping (with NDR/RTO), Integrations (by type)
- **[Planning/](./2_Development/Planning/)** - Development planning and roadmaps
  - Active plans, Masterplans (weeks 1-16), Parallel execution, Analysis
- **[Audit/](./2_Development/Audit/)** - Audit reports and progress tracking
  - Backend audits, Testing reports, Daily progress summaries
- **[Methodology/](./2_Development/Methodology/)** - Development standards and AI prompts

### [3_Technical/](./3_Technical/) - Technical Documentation
APIs, authentication, infrastructure, and templates
- **[API/](./3_Technical/API/)** - API documentation (Internal/External/Testing)
- **[Auth/](./3_Technical/Auth/)** - Authentication (Architecture/Implementation/Integration)
- **[Infrastructure/](./3_Technical/Infrastructure/)** - Setup, workflows, and guides
- **[Templates/](./3_Technical/Templates/)** - Code and documentation templates

### [4_UX/](./4_UX/) - UX Documentation
Frontend and design documentation
- **[Analysis/](./4_UX/Analysis/)** - Dashboard and UX analysis
- **[Planning/](./4_UX/Planning/)** - UX refactor plans
- **[Design/](./4_UX/Design/)** - Design resources and prompts

### [5_Resources/](./5_Resources/) - Reference Resources
Prompts, templates, and reference data
- **[Prompts/](./5_Resources/Prompts/)** - AI prompts and evaluation guides
- **[Data/](./5_Resources/Data/)** - Reference data and scenarios

### [6_Archive/](./6_Archive/) - Legacy Documentation
Archived audit logs and legacy documents
- **[Legacy_Docs/](./6_Archive/Legacy_Docs/)** - Outdated documentation

---

## 🗂️ Documentation Structure

```
docs/
├── 1_Project/          - Project management docs
├── 2_Development/      - Dev context, planning, audits
│   ├── Domains/        - Auth, Orders, Payments, Shipping, Integrations
│   ├── Planning/       - Active, Masterplans, Parallel, Analysis
│   ├── Audit/          - Backend, Testing, Progress
│   └── Methodology/    - CANON, AI Prompts
├── 3_Technical/        - APIs, Auth, Infrastructure
│   ├── API/            - Internal, External, Testing
│   ├── Auth/           - Architecture, Implementation, Integration
│   ├── Infrastructure/ - Setup, Workflows, Guides
│   └── Templates/      - Code templates
├── 4_UX/               - Analysis, Planning, Design
├── 5_Resources/        - Prompts, Data
└── 6_Archive/          - Legacy docs
```

---

## 🔍 Quick Find

| Looking for... | Go to... |
|----------------|----------|
| **API Endpoints** | `3_Technical/API/Internal/` or `External/` |
| **Integration Guides** | `2_Development/Domains/Integrations/` (by type) |
| **Development Plans** | `2_Development/Planning/Masterplans/` |
| **Domain Context** | `2_Development/Domains/` (Auth/Orders/Payments/Shipping) |
| **Auth Architecture** | `3_Technical/Auth/Architecture/` |
| **Frontend Auth** | `3_Technical/Auth/Implementation/Frontend/` |
| **Setup Guides** | `3_Technical/Infrastructure/Setup/` |
| **Audit Reports** | `2_Development/Audit/Backend/` or `Testing/` |
| **UX Analysis** | `4_UX/Analysis/` |
| **Templates** | `3_Technical/Templates/` |

---

## 📊 Documentation Stats

- **Total Folders**: 48
- **Total Documents**: 71 markdown files
- **Hierarchy Depth**: 4 levels (parent-child-child-child)
- **Organization**: Domain and functional group based

---

**Last Updated:** Jan 7, 2026  
**Structure Version:** 2.0 (Deep Hierarchical)
