
const lista = document.querySelector(".lista");
const button_add = document.querySelector(".add");
const valor_ganho = document.querySelector(".total");
const adicionar = document.querySelector(".adicionar");
const sair = document.querySelector(".sair");
const nome = document.querySelector("input#nome");
const descricao = document.querySelector("input#descricao");
const valor = document.querySelector("input#valor");
const itens = document.querySelector("input#itens");
const button_enviar = document.querySelector("input.enviar");

const CHAVE_PEDIDOS = "lista-de-pedidos";
const CHAVE_CAIXA = "caixa-financeiro";

function ler_dados(chave, padrao) {
    try {
        const dados = JSON.parse(localStorage.getItem(chave));
        return dados ?? padrao;
    } catch {
        return padrao;
    }
}

let dados_antigos = ler_dados(CHAVE_PEDIDOS, {});
let lista_pedidos = Array.isArray(dados_antigos)
    ? Object.fromEntries(dados_antigos.map(p => [p.id, p]))
    : dados_antigos;

let caixa = ler_dados(CHAVE_CAIXA, null);

// Migra pagamentos antigos para o caixa apenas na primeira execução.
if (!Array.isArray(caixa)) {
    caixa = [];

    Object.entries(lista_pedidos).forEach(([id, pedido]) => {
        if (pedido.pago) {
            caixa.push({
                id: crypto.randomUUID(),
                pedidoId: id,
                descricao: `Pagamento de ${pedido.pessoa}`,
                valor: Number(pedido.valor) || 0,
                data: new Date().toISOString()
            });

            pedido.pagamentoRegistrado = true;
        }
    });

    salvar_caixa();
} else {
    // Evita registrar novamente pagamentos que já estão no caixa.
    Object.entries(lista_pedidos).forEach(([id, pedido]) => {
        if (caixa.some(movimento =>
            String(movimento.pedidoId) === String(id) &&
            Number(movimento.valor) >= 0
        )) {
            pedido.pagamentoRegistrado = true;
        }
    });
}

function salvar() {
    localStorage.setItem(
        CHAVE_PEDIDOS,
        JSON.stringify(lista_pedidos)
    );
}

function salvar_caixa() {
    localStorage.setItem(
        CHAVE_CAIXA,
        JSON.stringify(caixa)
    );
}

function gerar_id() {
    return crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
}

function calcular_caixa() {
    return caixa.reduce(
        (total, movimento) => total + (Number(movimento.valor) || 0),
        0
    );
}

function atualizar_total() {
    if (!valor_ganho) return;

    valor_ganho.textContent = calcular_caixa().toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function abrir_form() {
    adicionar?.classList.add("aberto");
}

function fechar_form() {
    adicionar?.classList.remove("aberto");
}

function adicionar_pedidos() {
    const pessoa = nome.value.trim();
    const texto_descricao = descricao.value.trim();
    const preco = Number(valor.value);
    const quantidade = Number(itens.value) || 1;

    if (!pessoa || !texto_descricao) {
        alert("Preencha o nome e a descrição do pedido.");
        return;
    }

    if (valor.value === "" || !Number.isFinite(preco) || preco < 0) {
        alert("Informe um valor válido.");
        return;
    }

    if (!Number.isInteger(quantidade) || quantidade < 1) {
        alert("Informe uma quantidade válida.");
        return;
    }

    const id = gerar_id();

    lista_pedidos[id] = {
        pessoa,
        descricao: texto_descricao,
        valor: Math.round(preco * 100) / 100,
        itens: quantidade,
        pago: false,
        feito: false,
        pagamentoRegistrado: false
    };

    salvar();
    renderizar_pedidos();

    nome.value = "";
    descricao.value = "";
    valor.value = "";
    itens.value = "1";

    fechar_form();
}

function alterar_status(id, propriedade) {
    const pedido = lista_pedidos[id];

    if (!pedido) return;

    if (propriedade === "feito") {
        pedido.feito = !pedido.feito;
    }

    if (propriedade === "pago") {
        if (!pedido.pago) {
            if (!pedido.pagamentoRegistrado) {
                caixa.push({
                    id: gerar_id(),
                    pedidoId: id,
                    descricao: `Pagamento de ${pedido.pessoa}`,
                    valor: Number(pedido.valor) || 0,
                    data: new Date().toISOString()
                });

                pedido.pagamentoRegistrado = true;
                salvar_caixa();
            } else {
                alert("O pagamento deste pedido já foi registrado no caixa.");
            }

            pedido.pago = true;
        } else {
            // Desmarcar como pago não apaga o dinheiro do caixa.
            pedido.pago = false;
        }
    }

    salvar();
    renderizar_pedidos();
    atualizar_total();
}

function excluir_pedido(id) {
    const pedido = lista_pedidos[id];

    if (!pedido) return;

    const mensagem = pedido.pago
        ? "Excluir este pedido? O dinheiro registrado continuará no caixa."
        : "Deseja excluir este pedido?";

    if (!confirm(mensagem)) return;

    delete lista_pedidos[id];

    // Não apague nem altere o caixa ao excluir um pedido.
    salvar();
    renderizar_pedidos();
    atualizar_total();
}

function escapar_html(texto) {
    return String(texto).replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function renderizar_pedidos() {
    lista.innerHTML = "";

    const titulo = document.createElement("h1");
    titulo.textContent = "LISTA DE PEDIDOS";
    lista.appendChild(titulo);

    Object.entries(lista_pedidos).forEach(([id, pedido]) => {
        const artigo = document.createElement("article");
        artigo.className = "pedido";

        artigo.innerHTML = `
            <div class="identificacao">
                <h1>${escapar_html(pedido.pessoa)}</h1>
                <h3>${escapar_html(pedido.descricao)}</h3>
            </div>

            <div class="identificacao-pedido">
                <h2>${(Number(pedido.valor) || 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                })}</h2>
                <h2>Quantidade: ${Number(pedido.itens) || 1}</h2>
            </div>

            <div class="acoes-pedido">
                <button class="status-btn" data-acao="pago">
                    ${pedido.pago ? "Desmarcar pago" : "Marcar pago"}
                </button>

                <button class="status-btn" data-acao="feito">
                    ${pedido.feito ? "Desmarcar feito" : "Marcar feito"}
                </button>

                <button class="excluir-btn" data-acao="excluir">
                    Excluir
                </button>
            </div>
        `;

        artigo.querySelectorAll("button").forEach(botao => {
            botao.addEventListener("click", () => {
                const acao = botao.dataset.acao;

                if (acao === "excluir") {
                    excluir_pedido(id);
                } else {
                    alterar_status(id, acao);
                }
            });
        });

        lista.appendChild(artigo);
    });

    atualizar_total();
}

button_add?.addEventListener("click", abrir_form);
sair?.addEventListener("click", fechar_form);
button_enviar?.addEventListener("click", adicionar_pedidos);

renderizar_pedidos();
