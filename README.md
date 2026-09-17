# 🏋️ Gym Tracker — Progressive Web App

**Versão:** 1.0.0  
**Status:** Em Desenvolvimento Ativo

## 📋 Descrição

Aplicação web progressiva (PWA) para gerenciamento completo de treinos em academia. Desenvolvida com foco em performance, experiência mobile-first e funcionalidades avançadas como Coach IA integrado, gráficos de progresso e suporte offline.

## 🎯 Funcionalidades Principais

- 🤖 **AI Coach** — Assistente de treino integrado com a API do Gemini
- 📊 **Gráficos de Progresso** — Evolução de carga, volume mensal, radar muscular e peso corporal
- 📱 **Progressive Web App** — Instalável como aplicativo nativo, com suporte offline
- 🌍 **Multi-idioma** — Suporte completo para Português (BR) e Inglês
- ⏱️ **Timer Global** — Cronômetro de descanso com feedback vibratório e sonoro
- 🧘 **Zen Mode** — Modo de foco para sessões de treino sem distrações
- 🔥 **Sistema de Streak** — Gamificação para motivação e consistência
- 💪 **Plate Calculator** — Calculadora de anilhas para montagem de barra
- 🥗 **Controle de Dieta** — Macronutrientes e checklist diário (água, refeições)
- 💾 **Sincronização em Tempo Real** — Dados sincronizados via Firebase Firestore

## 🛠️ Tech Stack

| Camada | Tecnologia |
|---|---|
| **Frontend** | React 19, Vite 8 |
| **Animações** | Framer Motion |
| **Gráficos** | Chart.js + react-chartjs-2 |
| **Backend / Auth** | Firebase (Authentication + Firestore) |
| **Internacionalização** | i18next + react-i18next |
| **PWA** | vite-plugin-pwa |
| **Linting** | Oxlint |

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- npm 9+

### Desenvolvimento
```bash
npm install
npm run dev
```

### Build para Produção
```bash
npm run build
npm run preview
```

## 🔒 Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Firebase
VITE_FIREBASE_API_KEY=sua_chave_aqui
VITE_FIREBASE_AUTH_DOMAIN=seu_dominio_aqui
VITE_FIREBASE_PROJECT_ID=seu_project_id
VITE_FIREBASE_STORAGE_BUCKET=seu_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
VITE_FIREBASE_MEASUREMENT_ID=seu_measurement_id

# Gemini API
VITE_GEMINI_API_KEY=sua_chave_gemini
```

> ⚠️ **Importante:** O arquivo `.env.local` é automaticamente ignorado pelo `.gitignore`. Nunca comite credenciais no repositório.

## 🔐 Segurança

- ✅ Credenciais sensíveis em variáveis de ambiente (`.env.local`)
- ✅ Autenticação via Google OAuth (Firebase Auth)
- ✅ Firestore Security Rules com validação de tipos de dados
- ✅ Acesso restrito por UID — cada usuário só acessa seus próprios dados
- ✅ Error Boundary para captura de falhas na aplicação

## 📈 Performance

- Code splitting automático (React, Firebase, Charts em bundles separados)
- Lazy loading de componentes com animação
- `useMemo` para cálculos pesados em gráficos
- Limite de queries Firestore: 500 documentos
- Cache persistente com Service Worker (PWA)

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ErrorBoundary.jsx
│   ├── Login.jsx
│   ├── Login.module.css
│   ├── Navigation.jsx
│   ├── PlateCalculator.jsx
│   ├── TimerWidget.jsx
│   ├── WorkoutSummary.jsx
│   └── Workout/
│       ├── AICoachChat.jsx
│       ├── ExerciseCard.jsx
│       └── ZenMode.jsx
├── context/             # Estado global (Context API)
│   └── AppContext.jsx
├── data/                # Dados estáticos
│   └── exercises.js
├── firebase/            # Configuração Firebase
│   └── config.js
├── pages/               # Páginas da aplicação
│   ├── Diet.jsx
│   ├── History.jsx
│   ├── Home.jsx
│   ├── Profile.jsx
│   ├── Progress.jsx
│   └── Workout.jsx
├── utils/               # Funções utilitárias
│   └── colorUtils.js
├── App.jsx
├── App.css
├── index.css
├── i18n.js
└── main.jsx
```

## 📝 Licença

Este projeto é de uso pessoal.
