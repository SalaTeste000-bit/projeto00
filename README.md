# Psilog — versão Web (1.0.1)

Aplicação web para testes de atenção (go/no-go e variações): cadastro de pacientes,
aplicação de tarefas, resultados com gráficos e resumo com percentil.

## Como usar

**Teste rápido:** abra o `index.html` no navegador (duplo clique). Funciona sem servidor e sem instalação.
Nesse modo o botão "Entrar com Google" não aparece (o Google só funciona em http/https); entre com e-mail e senha.

**Para publicar (recomendado):** envie o *conteúdo desta pasta* para qualquer hospedagem de site estático
(Firebase Hosting, Netlify, GitHub Pages, servidor da escola...). Depois, no Firebase Console:
Authentication → Configurações → **Domínios autorizados** → inclua o endereço do site.
Veja `LEIA-ME-FIREBASE.txt`.

## Estrutura

```
Psilog-Web/
├── index.html            # única página; as telas trocam por rota (#/inicio, #/cadastro, ...)
├── assets/img/           # logo, ícone e mascote
├── css/
│   ├── base.css          # tokens, reset e tipografia
│   ├── layout.css        # menu suspenso e grades
│   ├── professional.css  # layout do aplicativo (menu lateral, topo) e impressão
│   ├── components.css    # card, botão, formulário, tabela, toast...
│   ├── themes.css        # temas: branco, verde, roxo, vermelho, laranja e noturno
│   └── views/            # estilos de cada tela
├── js/
│   ├── core/             # tema, utilitários, banco (IndexedDB), login, estatística, métricas do exame e roteador
│   ├── data/             # definição das tarefas
│   ├── views/            # uma tela por arquivo
│   └── app.js            # ponto de entrada
├── docs/                 # captura de tela de apoio
├── README.md
└── LEIA-ME-FIREBASE.txt
```

## Rotas

`#/inicio` · `#/cadastro` · `#/tarefas` · `#/teste` · `#/resultados` · `#/resumo` · `#/pacientes` ·
`#/atividades` · `#/dados` · `#/aparencia` · `#/tour` · `#/login`

## Banco de dados

IndexedDB do navegador (`js/core/db.js`). Os dados ficam só neste navegador/computador;
use a tela **Dados e backups** para backup (JSON) e exportação (CSV).

## Painel de resultados (novo)

`js/core/metrics.js` calcula, só com o que o teste já grava (tipo e TR de cada estímulo), precisão, omissões, erros por ação,
TR (média, mediana, quartis, DP, CV), d′ e critério c (correção log-linear), desempenho por blocos e a matriz go/no-go × resposta.
`js/views/resultados.js` desenha os gráficos em SVG (sem bibliotecas). Não há valores normativos: nada é classificado como normal ou alterado.
Na visão do profissional, os botões "Mostrar" escolhem quais gráficos e tabelas aparecem (a escolha fica salva no navegador).
Na visão do paciente, o botão "Análise detalhada" mostra ou esconde esse mesmo painel (vem ligado).

## Administração (Psilogo)

O acesso de administrador saiu do Psilog e virou um site separado, o **Psilogo** (pasta `psilogo/`).
Ele lista profissionais e pacientes cadastrados neste navegador e abre o Psilog com o perfil escolhido.
Precisa ser publicado no mesmo endereço do Psilog para enxergar os mesmos dados.

## Guia do teste

`#/guia`: passo a passo, instruções de cada tarefa e versão do software (para anexar tutorial em submissões).
