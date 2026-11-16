# Balcão Inteligente — Documentação Técnica e de Produto

Aplicativo web **mobile-first** projetado para donos de pequenas lojas de materiais de construção (LMCs de bairro) decidirem com rapidez **o que, quando, quanto e a que preço comprar**, com leitura de alto contraste sob luz solar forte no pátio e processamento **100% local no navegador** (sem chamadas a APIs externas ou LLMs).

---

## 1. Arquitetura Geral e Tecnologias

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4.
- **Processamento de Planilhas:** `xlsx` (SheetJS) rodando integralmente no cliente para leitura e exportação de arquivos `.xlsx` / `.xls`.
- **Ícones:** `lucide-react` + ícone personalizado da marca (`BI` em bloco de concreto).
- **Persistência:** `localStorage` do navegador (nenhum banco de dados remoto é exigido).
- **Layout Responsivo:** Largura máxima centralizada de `440px` (`max-w-[440px]`) no desktop sobre fundo `#F1F5F9` e `100%` da largura em dispositivos móveis, simulando uso com uma mão no pátio.

### Chaves de Persistência no `localStorage`
| Chave | Finalidade |
| --- | --- |
| `balcao_inteligente_uf_v1` | Estado (UF) atualmente selecionado (padrão: `SP`). |
| `balcao_inteligente_uf_manual_v1` | Indica se o usuário escolheu manualmente uma UF (`'true'`), evitando que o GPS automático sobrescreva sua escolha. |
| `balcao_inteligente_records_v1` | Registros importados da última planilha `.xlsx` carregada. |
| `balcao_inteligente_meta_v1` | Metadados da base ativa (`type`, `fileName`, `importedAt`, `ufCount`, `materialCount`). |
| `balcao_inteligente_configs_v1` | Parâmetros editáveis da loja por material (`estoqueAtual`, `vendas30d`, `diasEntrega`, `custoMedio`, `variacaoDemanda`). |
| `balcao_inteligente_welcome_open_v1` | Estado aberto/recolhido do card de boas-vindas na tela **Hoje**. |

---

## 2. Identidade Visual, Tipografia e Paleta de Cores

O aplicativo opera **exclusivamente em Light Mode de alto contraste**, otimizado para leitura rápida sob sol forte no pátio da loja.

### Paleta Base da Interface
| Elemento | Hexadecimal | Uso |
| --- | --- | --- |
| Fundo principal | `#FFFFFF` | Área principal do app, cabeçalho, barra inferior e campos de entrada |
| Fundo externo (desktop) | `#F1F5F9` | Plano de fundo fora do quadro central de `440px` |
| Superfície de cards | `#F8FAFC` | Cards de materiais, painéis de edição, simulador e tabela resumo |
| Borda estrutural | `#CBD5E1` | Contorno de cards, cabeçalho, navegação inferior e botões |
| Divisórias internas | `#E2E8F0` | Linhas sutis entre seções e linhas da tabela |
| Texto principal | `#0F172A` | Títulos, valores numéricos e rótulos principais |
| Texto secundário | `#334155` | Subtítulos, explicações e textos de apoio |
| Acento neutro / informativo | `#1D4ED8` | Ícones auxiliares, links de filtro e controles informativos |

### Paleta do Semáforo de Decisão (Cor + Ícone + Texto)
Nenhuma decisão é comunicada apenas por cor — cada estado combina cor de texto, fundo suave, borda, ícone e texto explícito:

| Decisão | Texto / Destaque | Fundo Suave | Borda | Ícone | Significado de Balcão |
| --- | --- | --- | --- | --- | --- |
| **COMPRAR AGORA** | `#15803D` | `#DCFCE7` | `#86EFAC` | Carrinho (`ShoppingCart`) | Estoque baixo. Peça hoje para não faltar no pátio. |
| **ANTECIPAR COMPRA** | `#B45309` | `#FEF3C7` | `#FCD34D` | Seta subindo (`TrendingUp`) | Preço vai subir antes da próxima reposição. Vale adiantar. |
| **NÃO COMPRAR** | `#B91C1C` | `#FEE2E2` | `#FCA5A5` | Mão parada (`Hand`) | Preço em queda e estoque suficiente no pátio. Segure o caixa. |
| **AGUARDAR** | `#1D4ED8` | `#DBEAFE` | `#93C5FD` | Relógio (`Clock`) | Estoque tranquilo e preço estável. Sem pressa para pedir. |

### Tipografia e Ergonomia de Toque
- **Título da Marca (*Balcão Inteligente*):** `Barlow` peso `700` (Bold), `22px`.
- **Interface e Corpo:** `Plus Jakarta Sans` (pesos `400`, `500`, `600`, `700`, `800`), tamanho base mínimo de `16px`.
- **Números-Chave:** `24px` a `30px` em destaque com `font-variant-numeric: tabular-nums` (classe `.font-num`), garantindo alinhamento vertical de valores monetários e quantidades (`JetBrains Mono` disponível como fonte auxiliar tabular).
- **Alvos de Toque:** Botões e campos interativos com altura mínima de `44px` a `52px` (`w-12 h-12` nos controles `-` e `+`).

### Linguagem 100% de Balcão
Para evitar barreiras de uso no dia a dia da loja, termos técnicos são substituídos por linguagem direta:
- *Lead time* $\rightarrow$ **Dias pro caminhão entregar**
- *Ponto de ressuprimento / ROP* $\rightarrow$ **Quando pedir de novo**
- *Projeção de tendência / SARIMA / IC80* $\rightarrow$ **O que vai acontecer com o preço** / **Faixa de variação**
- *Cobertura de estoque* $\rightarrow$ **Estoque dura X dias**

---

## 3. Todas as Fórmulas de Cálculo

Todo o motor matemático está implementado no cliente, sem arredondamentos intermediários destrutivos e com valores normalizados para evitar divisões por zero.

### 3.1. Preço Atual, Previsão e Tendência
Dado um material com série histórica mensal ordenada (`historico`) e até 3 meses previstos (`p1` = mês +1, `p2` = mês +2, `p3` = mês +3):

- **Preço Atual (Referência Hoje):**
  $$\text{precoAtual} = \text{último preço histórico disponível}$$
- **Preço Previsto em 45 dias** (média entre Mês 1 e Mês 2):
  $$\text{preco45d} = \frac{p_1.\text{prev} + p_2.\text{prev}}{2}$$
  $$\text{min45d} = \frac{p_1.\text{min} + p_2.\text{min}}{2}, \qquad \text{max45d} = \frac{p_1.\text{max} + p_2.\text{max}}{2}$$
- **Preço Previsto em 90 dias:**
  $$\text{preco90d} = p_3.\text{prev}$$
- **Variação em 45 dias e em 90 dias:**
  $$\text{var45d} = \frac{\text{preco45d}}{\text{precoAtual}} - 1$$
  $$\text{var90d} = \frac{p_3.\text{prev}}{\text{precoAtual}} - 1$$
  *(Caso $p_3.\text{prev}$ não esteja disponível, utiliza $\text{Var\_Projetada\_Trimestre\_\%} / 100$.)*
- **Classificação de Tendência (`classifyTrend`):**
  - **Alta:** se $\text{var45d} \ge +0{,}015$ ($+1{,}5\%$)
  - **Queda:** se $\text{var45d} \le -0{,}015$ ($-1{,}5\%$)
  - **Estável:** caso contrário ($-1{,}5\% < \text{var45d} < +1{,}5\%$)

### 3.2. Reposição e Cobertura de Estoque
Com os parâmetros da loja ($\text{vendas30d} \ge 0$, $\text{diasEntrega} \ge 1$, $\text{estoqueAtual} \ge 0$ e $\text{variacaoDemanda} = 0{,}25$ por padrão):

- **Venda Diária Média:**
  $$\text{vendaDiaria} = \frac{\text{vendas30d}}{30}$$
- **Estoque de Segurança** (nível de serviço de 95%, $z = 1{,}65$):
  $$\text{estoqueSeguranca} = 1{,}65 \times (\text{vendaDiaria} \times \text{variacaoDemanda}) \times \sqrt{\text{diasEntrega}}$$
- **Quando Pedir de Novo (Ponto de Pedido):**
  $$\text{quandoPedirDeNovo} = \lceil \text{vendaDiaria} \times \text{diasEntrega} + \text{estoqueSeguranca} \rceil$$
- **Quantos Dias o Estoque Dura:**
  $$\text{diasQueDura} = \begin{cases} \lfloor \text{estoqueAtual} / \text{vendaDiaria} \rfloor, & \text{se } \text{vendaDiaria} > 0 \\ 999, & \text{se } \text{vendaDiaria} = 0 \end{cases}$$
- **Quantidade Sugerida para Compra** (cobre tempo de entrega + 30 dias de giro + segurança, descontando o estoque atual):
  $$\text{quantidadeSugerida} = \max\Big(0,\; \lceil \text{vendaDiaria} \times (\text{diasEntrega} + 30) + \text{estoqueSeguranca} - \text{estoqueAtual} \rceil\Big)$$

### 3.3. Regra do Semáforo de Decisão (Ordem de Precedência)
1. Se $\text{estoqueAtual} \le \text{quandoPedirDeNovo}$ $\rightarrow$ **VERDE (`COMPRAR AGORA`)**
2. Senão, se $\text{tendencia} = \text{alta}$ **e** $\text{diasQueDura} < (\text{diasEntrega} + 30)$ $\rightarrow$ **AMARELO (`ANTECIPAR COMPRA`)**
3. Senão, se $\text{tendencia} = \text{queda}$ **e** $\text{diasQueDura} > (\text{diasEntrega} + 7)$ $\rightarrow$ **VERMELHO (`NÃO COMPRAR`)**
4. Senão $\rightarrow$ **AZUL (`AGUARDAR`)**

**Ordenação na lista da tela Hoje:**
1. Prioridade do semáforo: Verde (`0`) $\rightarrow$ Amarelo (`1`) $\rightarrow$ Vermelho (`2`) $\rightarrow$ Azul (`3`).
2. Desempate para Verde e Amarelo: menor `diasQueDura` primeiro (maior urgência).
3. Desempate para Vermelho e Azul: maior `dinheiroParado` primeiro.

### 3.4. Indicadores Financeiros e Comparação de Custo
- **Economia Estimada por Item (45 dias):**
  $$\text{economiaEstimada} = \begin{cases} \text{quantidadeSugerida} \times \text{precoAtual} \times \text{var45d}, & \text{se status for COMPRAR ou ANTECIPAR e } \text{var45d} > 0 \\ 0, & \text{caso contrário} \end{cases}$$
- **Dinheiro Parado no Estoque (KPI da tela Hoje):**
  $$\text{custoRef} = \begin{cases} \text{custoMedio}, & \text{se } \text{custoMedio} > 0 \\ \text{precoAtual}, & \text{caso contrário} \end{cases}$$
  $$\text{dinheiroParado} = \text{estoqueAtual} \times \text{custoRef}$$
- **Total do Estoque (aba Material):**
  $$\text{custoTotalEstoque} = \text{estoqueAtual} \times \text{custoMedio}$$
- **Diferença do Seu Custo vs. Referência Hoje:**
  $$\text{diferencaCustoReais} = \text{custoRef} - \text{precoAtual}$$
  $$\text{diferencaCustoPct} = \frac{\text{custoRef}}{\text{precoAtual}} - 1$$

### 3.5. Fórmulas do Simulador (Tela 3)

#### Modo 1 — *Quando pedir de novo?*
Usa exatamente as fórmulas da seção **3.2** sobre os números simulados (`vendas30d`, `diasEntrega`, `estoqueAtual`) e calcula adicionalmente:
- **Já passou da hora?** $\text{estoqueAtual} \le \text{quandoPedirDeNovo}$
- **Dias até atingir o ponto de pedir de novo:**
  $$\text{diasAtePedir} = \begin{cases} \max\left(0,\; \lfloor (\text{estoqueAtual} - \text{quandoPedirDeNovo}) / \text{vendaDiaria} \rfloor\right), & \text{se } \text{vendaDiaria} > 0 \\ 999, & \text{caso contrário} \end{cases}$$

#### Modo 2 — *Compro hoje ou espero?*
Com `quantidade` ($\ge 1$), `precoCotado` ($\ge 0{,}01$) e `diasEsperar` ($1$ a $90$):

1. **Interpolação Linear do Preço Esperado** ao longo dos marcos $[0, 30, 60, 90]$ dias usando $\text{precoAtual}$, $p_1.\text{prev}$, $p_2.\text{prev}$ e $p_3.\text{prev}$:
   $$\text{precoEsperado}(d) = \begin{cases} \text{precoAtual} + \frac{(p_1 - \text{precoAtual}) \cdot d}{30}, & 0 \le d \le 30 \\ p_1 + \frac{(p_2 - p_1) \cdot (d - 30)}{30}, & 30 < d \le 60 \\ p_2 + \frac{(p_3 - p_2) \cdot (d - 60)}{30}, & 60 < d \le 90 \end{cases}$$
   *(Para $d = 45$, resulta exatamente em $(p_1 + p_2)/2 = \text{preco45d}$.)*
2. **Preço-Alvo Máximo Hoje:**
   $$\text{precoAlvoMaximo} = \text{precoEsperado}(\text{diasEsperar})$$
3. **Comparativo Financeiro:**
   $$\text{custoHoje} = \text{quantidade} \times \text{precoCotado}$$
   $$\text{custoEsperando} = \text{quantidade} \times \text{precoEsperado}(\text{diasEsperar})$$
   $$\text{saldoComprarHoje} = \text{custoEsperando} - \text{custoHoje}$$
   - Se $\text{saldoComprarHoje} \ge 0$: comprar hoje economiza esse valor.
   - Se $\text{saldoComprarHoje} < 0$: esperar economiza $|\text{saldoComprarHoje}|$.
4. **Alerta de Risco de Falta no Pátio:**
   $$\text{diasTotaisAteChegar} = \text{diasEsperar} + \text{diasEntrega}$$
   $$\text{riscoFaltaNoPatio} = (\text{diasQueDura} < 999) \land (\text{diasTotaisAteChegar} > \text{diasQueDura})$$
   $$\text{diasSemProduto} = \max(0,\; \text{diasTotaisAteChegar} - \text{diasQueDura})$$

### 3.6. Escala do Gráfico SVG
Considerando os últimos **12 meses históricos** + os **3 meses previstos** (`prev`, `min`, `max`):
$$\text{pad} = \max\big((\text{rawMax} - \text{rawMin}) \times 0{,}18,\; \text{rawMax} \times 0{,}02\big)$$
$$\text{yMin} = \max(0,\; \text{rawMin} - \text{pad}), \qquad \text{yMax} = \text{rawMax} + \text{pad}$$

---

## 4. Geolocalização de Estado (UF)

Ao abrir o app pela primeira vez (ou enquanto `balcao_inteligente_uf_manual_v1` não for `'true'`), o aplicativo usa `navigator.geolocation.getCurrentPosition`:
1. Verifica se as coordenadas estão dentro do retângulo geográfico do Brasil ($\text{lat} \in [-34{,}0,\; 5{,}5]$, $\text{lon} \in [-74{,}2,\; -34{,}5]$).
2. Executa algoritmo **ponto-em-polígono** (*ray casting*) para os 27 estados (testando `DF` antes de `GO` por ser enclave).
3. Caso o ponto caia em região de fronteira não coberta pelo polígono simplificado, aplica fallback para o **centroide estadual mais próximo**.
4. Se o usuário estiver fora do Brasil, negar permissão ou o quadro de prévia bloquear geolocalização, mantém o fallback (`SP`) e exibe aviso orientativo ao clicar manualmente no botão de GPS.

---

## 5. Mapa Completo de Telas e O Que Faz Cada Botão

### 5.1. Cabeçalho Fixo e Barra Inferior (Presentes em todo o app)
- **Botão de Localização (ícone mira ao lado da UF):** Solicita a posição atual pelo navegador, remove a trava manual anterior, detecta a UF brasileira correspondente e atualiza todo o painel. Caso falhe (bloqueio de iframe, permissão negada, sinal indisponível, timeout ou fora do Brasil), exibe um banner explicativo temporário.
- **Seletor de Estado (`UF`):** Lista todas as UFs disponíveis na base carregada (27 por padrão). Ao trocar manualmente, salva `balcao_inteligente_uf_manual_v1 = 'true'` para que o GPS não sobrescreva a escolha em recarregamentos futuros.
- **Barra de Navegação Inferior (4 abas fixas):**
  - **Hoje:** Abre a Tela 1 (Decisão Rápida).
  - **Material:** Abre a Tela 2 (Detalhe do material atualmente selecionado).
  - **Simular:** Abre a Tela 3 (Calculadora de Balcão).
  - **Previsão:** Abre a Tela 4 (Importação Excel e resumo da UF).

### 5.2. Tela 1 — Hoje (Decisão Rápida)
- **Botão `Bem-vindo! Como ler este painel` (`Abrir` / `Ocultar`):** Expande ou recolhe o guia rápido com explicação amigável das 4 cores do semáforo e do campo *Seu custo médio (R$)*. Salva a preferência no `localStorage`.
- **Card Verde (`Comprar`):** Filtra a lista para exibir apenas itens com status `COMPRAR_AGORA`. Tocar novamente remove o filtro.
- **Card Amarelo (`Antecipar`):** Filtra a lista para exibir apenas itens com status `ANTECIPAR_COMPRA`. Tocar novamente remove o filtro.
- **Card Vermelho (`Não comprar`):** Filtra a lista para exibir apenas itens com status `NAO_COMPRAR`. Tocar novamente remove o filtro.
- **Botão `Itens em situação tranquila (Aguardar)`:** Exibido quando há itens `AGUARDAR`; filtra a lista para esses itens (e limpa ao tocar novamente).
- **Botão `Ver todos (N)`:** Aparece acima dos cards do semáforo quando qualquer filtro está ativo, limpando o filtro e exibindo todos os materiais.
- **Cards da Lista Priorizada:** Cada card mostra nome do material, estoque no pátio, chip do semáforo, duração em dias e tendência de preço em 45 dias. **Tocar em qualquer card** seleciona o material e abre a **Tela 2 (Material)**.

### 5.3. Tela 2 — Material (Detalhe do Material)
- **Botão `Voltar`:** Retorna imediatamente para a Tela 1 (**Hoje**).
- **Seletor `Trocar material`:** Dropdown no topo para alternar rapidamente entre todos os materiais da UF sem voltar para a lista.
- **Faixa de Preço e Custo do Estoque (logo abaixo da unidade):** Exibe lado a lado **Ref. hoje**, **Custo médio** e **Total estoque** ($\text{Estoque atual} \times \text{Seu custo médio}$).
- **Botões `-` e `+` / Campo `Estoque atual no pátio`:** Soma ou subtrai em passos proporcionais ao volume (`1`, `5`, `10` ou `50`) ou permite digitação direta; recalcula semáforo, duração, quantidade sugerida, total em estoque e KPIs instantaneamente.
- **Botões `-` e `+` / Campo `Vendas no mês`:** Ajusta o giro dos últimos 30 dias (passos proporcionais ou digitação direta), recalculando imediatamente o ponto de pedido e os dias que o estoque dura.
- **Botões `-` e `+` / Campo `Dias pro caminhão entregar`:** Ajusta o prazo de entrega em dias (mínimo `1`).
- **Campo `Seu custo médio (R$)`:** Aceita valores decimais (com passo `0,10`); atualiza o **Total do estoque** exibido logo abaixo do campo, no topo do material, na seção *3. Seu Custo* e no KPI *Dinheiro parado no estoque* da tela **Hoje**.
- **Botão verde `Copiar pedido pro WhatsApp`:** Copia para a área de transferência a mensagem pronta:
  > *"Olá! Preciso cotar [Qtd] [Unidade] de [Material] para entrega aqui na loja. Qual o melhor preço e prazo?"*
  *(Usa a quantidade sugerida ou, se for `0`, as vendas mensais arredondadas para cima; exibe banner de confirmação na tela).*
- **Botão `Simular outro cenário`:** Leva o usuário à **Tela 3 (Simular)** com o material atual já pré-selecionado.

### 5.4. Tela 3 — Simular (Calculadora de Balcão)
- **Aba `Quando pedir de novo?`:** Ativa o simulador de ponto de pedido e cobertura.
- **Aba `Compro hoje ou espero?`:** Ativa o simulador financeiro de oportunidade de compra vs. espera.
- **Seletor `Material para simular`:** Seleciona o insumo cujos preços e prazo base alimentam o cálculo.
- **Controles numéricos com botões `-` e `+` + campo digitável:**
  - *No modo 1:* **Dias pro caminhão entregar** (mín. `1`), **Vendas nos últimos 30 dias** (mín. `0`), **Estoque atual no pátio** (mín. `0`).
  - *No modo 2:* **Quantidade que quer comprar** (mín. `1`), **Preço cotado hoje pelo vendedor (R$)** (mín. `0,01`, passo dinâmico de acordo com o valor do material), **Quantos dias pode esperar** (`1` a `90`, botões `-`/`+` em passos de `5` dias).

### 5.5. Tela 4 — Previsão (Automação via Excel)
- **Zona de Upload (clique ou arraste de arquivo `.xlsx` / `.xls`):** Lê a aba `Historico_36M_e_Projecao` (ou a primeira aba disponível), detecta dinamicamente as colunas `YYYY-MM` e `YYYY-MM_Prev` (+ `_IC80_Min` e `_IC80_Max`), salva no `localStorage` e atualiza todo o app instantaneamente, exibindo feedback de carregamento, sucesso ou erro detalhado de coluna ausente.
- **Botão `Baixar planilha modelo (.xlsx)`:** Gera e faz download de um arquivo `Projecao_SINAPI_UF_Insumo_3M.xlsx` completo e válido com todos os registros ativos (324 linhas na base padrão: 27 UFs $\times$ 12 insumos).
- **Botão `Voltar aos dados de demonstração`:** Exibido quando há uma planilha importada; remove a planilha importada do `localStorage` e restaura a base padrão de demonstração.
- **Tabela `Resumo em [UF]`:** Lista cada material da UF selecionada com **Atual**, **45d** (preço + %), **90d** (preço + %) e status. **Tocar em qualquer linha** abre o detalhe daquele material na Tela 2.

---

## 6. Estrutura Esperada da Planilha Excel e Base Pré-Carregada

### Colunas da aba `Historico_36M_e_Projecao`
- **Identificação:** `UF`, `Codigo_SINAPI`, `Insumo`, `Unidade_Comercial`
- **Histórico Mensal:** Colunas no padrão `AAAA-MM` (ex.: `2023-11` até `2026-10`, ordenadas cronologicamente)
- **Previsão (3 meses detectados dinamicamente):**
  - `AAAA-MM_Prev`, `AAAA-MM_IC80_Min`, `AAAA-MM_IC80_Max` para cada um dos 3 meses previstos
- **Resumo Trimestral (opcional, calculado automaticamente se ausente):** `Var_Projetada_Trimestre_%`

### Os 12 Materiais Pré-Carregados (27 UFs)
1. Vergalhão CA-50 10 mm (`barra 12m`)
2. Cimento CP II 50 kg (`saco 50kg`)
3. Vergalhão CA-50 8 mm (`barra 12m`)
4. Areia média (`m³`)
5. Brita 1 (`m³`)
6. Bloco cerâmico 9x19x39 (`milheiro`)
7. Bloco cerâmico 9x19x39 (furos verticais) (`milheiro`)
8. Argamassa AC-II 20 kg (`saco 20kg`)
9. Arame recozido nº 18 (`kg`)
10. Tinta acrílica 18 L (`lata 18L`)
11. Tubo PVC esgoto 100 mm (`barra 6m`)
12. Cabo flexível 2,5 mm² (`rolo 100m`)

---

## 7. Sugestões de Evolução com Capabilities de IA

Mantendo o núcleo determinístico atual a custo zero e acionando IA **apenas sob demanda via rota de servidor** (protegendo chaves de API):

1. **Leitura de Nota Fiscal (DANFE) e Orçamentos por Foto/PDF (Visão Multimodal):**
   Extrair automaticamente itens, quantidades e valores unitários de fotos de notas fiscais ou prints de WhatsApp, recalculando o **Seu custo médio (R$)** e somando ao **Estoque atual**.
2. **Atualização de Estoque por Voz ("Mãos Livres no Pátio"):**
   Permitir que o lojista fale contagens de pátio em áudio curto (ex.: *"Contei 90 barras de vergalhão 10 mm"*) para atualizar os campos sem precisar digitar.
3. **Importação Inteligente de Planilhas de Distribuidores/ERPs:**
   Fazer o de-para automático de relatórios com nomes abreviados ou colunas fora do padrão (ex.: `"CIM CP2 50K"`) para os insumos da base do aplicativo.
4. **Copiloto de Negociação para WhatsApp:**
   A partir da resposta de preço do fornecedor, gerar uma resposta curta e educada de balcão com argumento objetivo baseado no *preço-alvo máximo* e na tendência de queda/alta.
5. **Resumo Matinal do Pátio em Linguagem Natural:**
   Gerar 2 ou 3 frases de abertura do dia priorizando o que fecha com maior economia ou maior risco imediato de falta.
6. **Ajuste Sazonal de Demanda por Clima e Região:**
   Sugerir ajustes nas *vendas no mês* conforme períodos chuvosos ou secos da `UF` selecionada antes que haja excesso de estoque parado ou ruptura.
