# Guia de teste de usabilidade (Sprint 4)

Roteiro para conduzir o teste formativo de usabilidade previsto na Seção 3.5.7 da metodologia: tarefas representativas do protocolo de coleta, seguidas da aplicação do questionário SUS. Avalia só o **app da participante** (`index.html`), já que é esse o lado usado pelas "usuárias" do protocolo — não o painel da pesquisadora.

Recomenda-se de 3 a 5 testadoras (não precisam ser as participantes reais da pesquisa; podem ser colegas, amigas ou qualquer mulher disponível para o teste), uma de cada vez, sem ajuda durante as tarefas.

## Antes de começar

1. Rode o sistema localmente (`npm start`) ou em um ambiente acessível para a testadora.
2. Abra `http://localhost:3000` no dispositivo da testadora (idealmente o celular dela, já que é como ela usaria de verdade).
3. Explique: "Vou te pedir para fazer algumas tarefas num app de pesquisa. Não existe jeito certo ou errado — eu quero ver como o app se comporta, não testar você. Pensa em voz alta enquanto usa, se puder."
4. Anote (papel, nota no celular) qualquer dificuldade, hesitação ou comentário espontâneo durante as tarefas — isso é tão importante quanto a pontuação do SUS.

## Tarefas representativas

Peça para a testadora executar, sem ajuda, nesta ordem:

1. **Aceitar participar da pesquisa.** ("Abra o link e entre na pesquisa.")
2. **Chegar até a tela de instruções de coleta** e ler o que é pedido.
3. **Enviar uma recomendação de teste**, usando qualquer link de post/Reels (pode ser um link qualquer, não precisa ser real) e preenchendo rede, formato, data e o motivo.
4. **Conferir o status dos próprios envios** (quantos de 3 já foram enviados).

Observe, sem interferir, se ela:
- hesita em algum ponto ou pergunta "e agora?";
- entende o que o código anônimo significa e por que precisa guardá-lo;
- entende por que está colando um link em vez de enviar um print;
- comete algum erro de preenchimento (e se percebe sozinha).

## Depois das tarefas: aplicar o SUS

1. Abra `http://localhost:3000/sus.html` (pode ser no mesmo dispositivo, logo após as tarefas, com a experiência ainda fresca).
2. Peça para a testadora responder sozinha, sem comentar as respostas com você enquanto preenche.
3. O campo "Identificação da sessão" é opcional — pode preencher com algo como "Testadora 1" só para você conseguir cruzar com suas anotações depois. Nenhum dado identificável é pedido.
4. As respostas vão direto para o back-end; a testadora não vê a pontuação.

## Lendo os resultados

No painel da pesquisadora (`/admin.html`), aba **Usabilidade (SUS)**:

- **Pontuação SUS média**: de 0 a 100. Acima de 68 é considerado "Bom" (média de referência na literatura); abaixo de 51, abaixo do aceitável.
- **Pontos de atrito por afirmação**: mostra a contribuição média de cada uma das 10 afirmações (0 a 4, sempre "maior é melhor", já normalizado). As afirmações com média mais baixa apontam onde vale a pena investigar — cruze com as anotações que você fez durante as tarefas.

## Depois de analisar

Conforme a Seção 3.5.7 da metodologia, os defeitos e dificuldades identificados devem ser registrados como issues no GitHub Project e corrigidos antes de considerar a branch `main` pronta para o estudo piloto.
