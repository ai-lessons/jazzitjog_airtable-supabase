# Project Architecture Overview

**Project:** ChatOpenAI Integration Assistant  
**Version:** 2.0  
**Last Updated:** 2025-09-30  
**Status:** Active Development

---

## 🎯 Quick Reference

**For Claude Code:** Read this section first for immediate context

### Critical Architecture Decisions
- **Files:** OpenAI Files API (NOT Supabase Storage)
- **State:** Zustand (NOT Redux/Context)
- **Database:** PostgreSQL via Supabase
- **File Metadata:** JSONB arrays in `personalities.files`

### Key Files to Read
- **This file:** Architecture overview and active backlog
- **CLAUDE.md:** Critical rules for Claude Code
- **DATABASE_CHANGELOG.md:** Database structure history
- **README.md:** Project overview and setup

### Active Backlog Location
👉 **See "Current Implementation Status" section below** - this is the SINGLE SOURCE OF TRUTH for what's done and what's planned.

---

## 📊 Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript + Vite
- **State Management:** Zustand (useStore)
- **UI/CSS:** Tailwind CSS + Lucide React icons
- **Routing:** React Router (if used)

### Backend & Infrastructure  
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **File Storage:** OpenAI Files API (NOT Supabase Storage)
- **AI Integration:** OpenAI Assistants API + Embeddings API

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.56.0",
  "openai": "^5.16.0", 
  "zustand": "state management",
  "react": "^18.3.1",
  "lucide-react": "^0.344.0"
}
```

---

## 🗂️ Project Structure

```
src/
├── components/           # React components
│   ├── Personalities.tsx # Assistant management + files
│   ├── FileDropZone.tsx  # Drag & drop component
│   ├── ChatArea.tsx      # Chat interface
│   └── Sidebar.tsx       # Navigation
├── lib/                  # Services and utilities
│   ├── supabase.ts       # Supabase client + types
│   ├── openai.ts         # OpenAI API service
│   ├── fileProcessing.ts # File processing
│   └── ragService.ts     # RAG service (legacy)
├── store/
│   └── useStore.ts       # Zustand store
└── App.tsx

supabase/
├── docs/                 # Database documentation
│   └── DATABASE_CHANGELOG.md
├── scripts/              # Migrations and scripts
└── migrations/           # SQL migrations
```

---

## 🏗️ Core Architecture Decisions

### 1. File Architecture: OpenAI Files API

**Decision:** Files stored in OpenAI, NOT in our database  
**Rationale:**
- ✅ Native integration with Assistants API
- ✅ Automatic vectorization and search  
- ✅ Less infrastructure complexity
- ✅ Reproduces Custom GPT logic

**Alternatives Considered:**
- ❌ Supabase Storage + custom RAG system
- ❌ Local storage + vectorization

**Data Structure:**
```typescript
// Database stores only metadata:
files: PersonalityFile[] = [
  {
    openai_file_id: "file-abc123", // ID in OpenAI
    file_name: "document.pdf",
    file_size: 1024000,
    status: "ready" | "processing" | "error"
  }
]
```

### 2. State Management: Zustand

**Decision:** Zustand instead of Redux/Context API  
**Rationale:**
- ✅ Simple to use
- ✅ TypeScript support  
- ✅ Minimal boilerplate
- ✅ Excellent performance

### 3. Database: JSONB vs Relational

**Decision:** JSONB for files, relational structure for core data  
**Rationale:**
- ✅ `personalities.files` as JSONB array - flexibility
- ✅ PostgreSQL excellent JSONB support
- ✅ Fewer JOINs when reading data
- ✅ Atomic updates of file array

---

## 🔧 Key Services & Components

### OpenAI Service (src/lib/openai.ts)
**Purpose:** Interaction with OpenAI API  
**Key Methods:**
```typescript
- createAssistant() → create assistant with name transliteration
- updateAssistant() → update prompt + file_instruction  
- uploadFileToOpenAI() → upload file to OpenAI Files API
- deleteFileFromOpenAI() → delete file from OpenAI
- listFiles() → list all assistant files
- runAssistant() → run chat with optimized polling
- checkRun() → check status without duplication
```

**Architectural Features:**
- Cyrillic → Latin transliteration for OpenAI
- System prompt = base_prompt + file_instruction  
- Polling with minimal API calls

### Zustand Store (src/store/useStore.ts)
**Purpose:** Central application state  
**Structure:**
```typescript
AppState {
  // Auth
  user: User | null
  
  // Chats
  chats: Chat[]
  messages: Message[] 
  currentChatId: string | null
  
  // Personalities  
  personalities: Personality[]
  activePersonality: Personality | null
  
  // Services
  openaiService: OpenAIService
}
```

**Key Methods:**
- `sendMessage()` → send message with optimized polling
- `updatePersonality()` → update + sync with OpenAI
- `uploadPersonalityFile()` → coordinate file upload
- `deletePersonalityFile()` → delete file with assistant update

### FileDropZone Component (src/components/FileDropZone.tsx)
**Purpose:** Reusable drag & drop component  
**Features:**
- Full drag & drop functionality
- Visual state indicators (hover, active, error)
- Compact mode for different UI contexts
- Built-in file validation
- TypeScript typed props

### Database Layer (src/lib/supabase.ts)
**Purpose:** Typed access to Supabase  
**Features:**
- Strict TypeScript types for all tables
- PersonalityFile interface for JSONB structure
- RLS (Row Level Security) policies

---

## 📡 Data Flow & Integration Patterns

### 1. Create/Update Personality
```
UI Form → useStore.updatePersonality() → 
├── Update Supabase DB
├── openaiService.updateAssistant() (system prompt)  
└── UI State Update
```

### 2. Chat Message Flow
```
User Input → useStore.sendMessage() →
├── Add to local messages[]
├── Save to Supabase  
├── openaiService.addMessage() → OpenAI Thread
├── openaiService.runAssistant() → Start run
├── Optimized polling checkRun()  
├── Get response from Thread
└── Update UI + Save to DB
```

### 3. File Upload Flow
```
File Selection → uploadPersonalityFile() →
├── openaiService.uploadFileToOpenAI() → file_id
├── Update personality.files[] in DB
├── openaiService.updateAssistant() → update prompt  
└── UI refresh
```

---

## 🎯 Development Standards

### Code Organization
- **1 component = 1 file**
- **Services in lib/** for reusability
- **Strict TypeScript** - no any (except exceptions)
- **Naming:** camelCase for variables, PascalCase for components

### Database Patterns  
- **UUID** for all Primary Keys
- **JSONB** for complex data structures
- **RLS** for row-level security
- **Migrations** via scripts with logging

### Error Handling
- **Try/catch** in async functions
- **User-friendly** error messages
- **Console logging** for debugging
- **Fallback states** in UI

### Performance Optimizations  
- **Optimized polling** OpenAI API
- **Zustand selective subscriptions**
- **GIN indexes** for JSONB queries
- **Minimal re-renders** in React

---

## 📋 Current Implementation Status

**🎯 THIS IS THE ACTIVE BACKLOG - SINGLE SOURCE OF TRUTH**

### ✅ Completed (v1.2)
- [x] Basic chat with assistants
- [x] Personality management  
- [x] OpenAI integration + polling optimization
- [x] Name transliteration for OpenAI
- [x] JSONB structure for files
- [x] Database cleanup from legacy fields

### ✅ Completed (v1.3)
- [x] File upload to assistants  
- [x] File management UI
- [x] Drag & drop interface
- [x] File deletion functionality
- [x] Multi-file support (max 20 per personality)

### 🚧 In Development
- [ ] Integration testing for file upload
- [ ] Error handling improvements
- [ ] File upload progress indicators

### 📋 Planned (Priority Order)
1. [ ] Function calling for assistants
2. [ ] Advanced file types support (images, spreadsheets)
3. [ ] Export/import chats
4. [ ] Usage analytics
5. [ ] Assistant templates library
6. [ ] Conversation search

### 🔮 Future Considerations
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Mobile app
- [ ] API for external integrations

---

## 📚 Related Documentation

### For Claude Code:
- **CLAUDE.md** - Critical rules, code patterns, and sprint workflow

### For Developers:
- **README.md** - Project overview and setup
- **DATABASE_CHANGELOG.md** - Database evolution history
- **supabase/docs/** - Additional technical documentation

### For Users:
- **User Guide** (planned) - End-user documentation
- **API Documentation** (planned) - External API reference

---

## 🔄 Evolution & Migration Strategy

### Approach to Changes
1. **Document decision** in this file
2. **Database changes** → DATABASE_CHANGELOG.md
3. **Backward compatibility** when possible
4. **Feature flags** for experimental functionality

### Migration Pattern
```
Planning → Implementation → Testing → Documentation → Deployment
    ↓           ↓              ↓           ↓            ↓
  This file  Code+Tests    Manual QA   Update docs   Git push
```

### Version Numbering
- **Major (2.0):** Breaking changes, major features
- **Minor (1.3):** New features, no breaking changes
- **Patch (1.3.1):** Bug fixes only

---

## 🎓 Onboarding Guide

### New Developers Start Here:
1. Read this file (architecture overview)
2. Read README.md (setup instructions)
3. Read DATABASE_CHANGELOG.md (current DB structure)
4. Read CLAUDE.md (if using Claude Code)
5. Run `npm install && npm run dev`
6. Review "Current Implementation Status" for active tasks

### Understanding the Codebase:
```
Start → App.tsx → useStore.ts → Key components
   ↓
Review lib/ services (openai.ts, supabase.ts)
   ↓
Understand data flow patterns (see above)
   ↓
Check current sprint tasks in "Current Implementation Status"
```

---

## 📞 Getting Help

### Questions About:
- **Architecture decisions** → Review this file
- **Database structure** → DATABASE_CHANGELOG.md
- **Setup issues** → README.md
- **Claude Code workflow** → CLAUDE.md

### Contributing:
- Follow development standards above
- Update documentation when making changes
- Run tests before committing
- Follow sprint workflow (see CLAUDE.md)

---

*This document is maintained to stay current for effective development*  
*Last updated: 2025-09-30*