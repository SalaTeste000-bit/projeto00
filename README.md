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

## Acesso de administrador

Na tela de entrar há o botão **Administrador (sem senha)** (também na tela com conta na nuvem). Ele abre uma lista com todos os
profissionais e pacientes cadastrados neste navegador; basta clicar em **Entrar** para usar o Psilog como aquele perfil, sem senha nem e-mail.
Também dá para cadastrar um profissional ou paciente ali mesmo. Enquanto estiver nesse modo, o botão **Admin · trocar perfil** fica no topo
(e no menu ☰ no celular). **Sair** encerra o modo administrador. Os dados continuam só neste navegador.

## O que mudou na 1.0.1

- **Menu ☰ (celular/janela estreita) agora abre.** Antes ele abria e fechava no mesmo clique.
- **"Sair" no menu ☰.** No celular não havia como sair da conta.
- **"Ir para o conteúdo"** não leva mais para o início (o link mexia no hash usado pelo roteador).
- **Teste:** a cor do estímulo não entrega mais a resposta. Antes a letra K (e os números que não repetem)
  apareciam em vermelho e os demais em verde. Agora são neutros; as tarefas coloridas por regra continuam iguais.
- **Teste:** ESPAÇO não reinicia mais o teste quando o botão "Começar" ainda estava focado.
- **Exportar CSV** usa ";" (o Excel em português separa as colunas), protege contra fórmulas e escapa todas as células.
- **Importar backup** atualiza as atividades na hora, rejeita arquivos que não são do Psilog.
- **Apagar tudo** pede confirmação na própria tela (o `prompt()` do navegador não existe no app Windows).
- **Entrar com Google** só aparece onde funciona (site em http/https).
- **Imprimir / salvar PDF** sai só com o conteúdo, em fundo branco e com as cores dos gráficos.
- Erro numa tela mostra uma mensagem com botão "Voltar ao início", em vez de página em branco.
- Gráfico de tempo de reação não quebra quando todos os valores são zero.

## Aviso

Os percentis comparam apenas os exames salvos localmente; não são tabelas normativas
clínicas e não substituem avaliação profissional.

## Seleção de tarefa por dificuldade

Na tela **Tarefas cognitivas**, as atividades ficam dentro de três abas: **Fácil**, **Médio** e **Difícil**.
Clique na logo para recolher ou abrir as abas; clique numa aba para ver só as atividades daquele nível
(clicar de novo na mesma aba fecha a lista). Atividades criadas pelo profissional entram pelo campo `nivel`
(sem nível definido, vão para Médio). Arquivos: `js/views/tarefas.js` e `css/views/tarefas.css`.
