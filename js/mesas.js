// js/mesas.js
// Lógica para controle de Mesas e Comandas (Nicho Restaurante)

document.addEventListener('DOMContentLoaded', () => {
    const usuario = JSON.parse(sessionStorage.getItem('usuario'));
    if (!usuario) {
        window.location.href = 'index.html';
        return;
    }

    let mesas = [];

    // =====================================================
    // CARREGAR MESAS DO SUPABASE
    // =====================================================
    async function carregarMesas() {
        try {
            const { data, error } = await supabaseClient
                .from('mesas_comandas')
                .select('*')
                .order('numero');

            if (error) throw error;
            mesas = data || [];
            renderizarMesas();

        } catch (error) {
            console.error('Erro ao carregar mesas:', error);
            mostrarNotificacao('Erro ao carregar mesas e comandas', 'error');
        }
    }

    function renderizarMesas() {
        const container = document.getElementById('restaurantContainer');
        if (!container) return;

        const filtroTipo = document.getElementById('filtroTipo').value;
        const filtroStatus = document.getElementById('filtroStatus').value;

        // Filtrar localmente
        let filtrados = mesas.filter(m => {
            const matchTipo = !filtroTipo || m.tipo === filtroTipo;
            const matchStatus = !filtroStatus || m.status === filtroStatus;
            return matchTipo && matchStatus;
        });

        if (filtrados.length === 0) {
            container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--gray);">
                🍽️ Nenhuma mesa ou comanda cadastrada com estes filtros.
            </div>`;
            return;
        }

        const statusLabels = {
            livre: 'Livre',
            ocupada: 'Ocupada',
            fechando: 'Pedindo Conta'
        };

        const tipoIcones = {
            mesa: '🪑',
            comanda: '📝'
        };

        container.innerHTML = filtrados.map(m => {
            const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.valor_acumulado);
            
            return `
                <div class="mesa-card status-${m.status}" onclick="gerenciarConsumo(${m.id})">
                    <div class="mesa-icon">${tipoIcones[m.tipo]}</div>
                    <div class="mesa-numero">${m.numero}</div>
                    <span class="mesa-status status-badge-${m.status}">${statusLabels[m.status]}</span>
                    <div class="mesa-valor">${m.valor_acumulado > 0 ? valorFormatado : 'R$ 0,00'}</div>
                </div>
            `;
        }).join('');
    }

    // =====================================================
    // CRIAR MESA / COMANDA
    // =====================================================
    async function salvarMesa() {
        const numero = document.getElementById('numero').value.trim();
        const tipo = document.getElementById('tipo').value;

        if (!numero || !tipo) {
            mostrarNotificacao('Informe o número ou identificação!', 'error');
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('mesas_comandas')
                .insert([{
                    numero: numero,
                    tipo: tipo,
                    status: 'livre',
                    valor_acumulado: 0.00
                }]);

            if (error) throw error;
            mostrarNotificacao('Mesa/Comanda criada!', 'success');
            document.getElementById('modalMesa').style.display = 'none';
            document.getElementById('mesaForm').reset();
            carregarMesas();

        } catch (error) {
            console.error('Erro ao salvar mesa:', error);
            mostrarNotificacao('Erro ao cadastrar Mesa/Comanda (verifique duplicidade)', 'error');
        }
    }

    // =====================================================
    // GERENCIAR CONSUMO (Modal Consumo)
    // =====================================================
    window.gerenciarConsumo = (id) => {
        const m = mesas.find(item => item.id === id);
        if (!m) return;

        document.getElementById('consumoMesaId').value = m.id;
        document.getElementById('consumoTitle').innerHTML = `${m.tipo === 'mesa' ? '🪑' : '📝'} Gerenciar ${m.numero}`;
        document.getElementById('consumoValorTotal').textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.valor_acumulado);
        document.getElementById('consumoStatus').value = m.status;
        document.getElementById('lancamentoValor').value = '';

        // Exibir botão de checkout (Vender) se houver consumo acumulado
        const btnCheckout = document.getElementById('btnLancarVendaMesa');
        if (btnCheckout) {
            if (m.valor_acumulado > 0) {
                btnCheckout.style.display = 'inline-block';
            } else {
                btnCheckout.style.display = 'none';
            }
        }

        document.getElementById('modalConsumo').style.display = 'flex';
    };

    async function atualizarConsumo() {
        const id = parseInt(document.getElementById('consumoMesaId').value);
        const m = mesas.find(item => item.id === id);
        if (!m) return;

        const lancamento = parseFloat(document.getElementById('lancamentoValor').value) || 0;
        const status = document.getElementById('consumoStatus').value;
        
        let novoValor = m.valor_acumulado + lancamento;
        let novoStatus = status;

        // Se o status for setado como livre, zera o consumo acumulado
        if (status === 'livre') {
            novoValor = 0.00;
        } else if (lancamento > 0 && status === 'livre') {
            novoStatus = 'ocupada'; // se lançou valor, marca como ocupada
        } else if (novoValor > 0 && status === 'livre') {
            novoStatus = 'ocupada'; // se tem valor e estava livre, força ocupada
        }

        try {
            const { error } = await supabaseClient
                .from('mesas_comandas')
                .update({
                    status: novoStatus,
                    valor_acumulado: novoValor
                })
                .eq('id', id);

            if (error) throw error;
            mostrarNotificacao('Mesa atualizada com sucesso!', 'success');
            document.getElementById('modalConsumo').style.display = 'none';
            carregarMesas();
        } catch (error) {
            console.error('Erro ao atualizar consumo:', error);
            mostrarNotificacao('Erro ao atualizar consumo', 'error');
        }
    }

    // Lançar Venda/Checkout
    document.getElementById('btnLancarVendaMesa')?.addEventListener('click', () => {
        const id = parseInt(document.getElementById('consumoMesaId').value);
        const m = mesas.find(item => item.id === id);
        if (!m) return;

        // Armazenar temporariamente no sessionStorage para o PDV (saidas.html) carregar
        sessionStorage.setItem('checkout_restaurante', JSON.stringify({
            mesa_id: m.id,
            numero: m.numero,
            valor: m.valor_acumulado
        }));

        document.getElementById('modalConsumo').style.display = 'none';
        window.location.href = 'saidas.html';
    });

    document.getElementById('btnAdicionarLancamentoRapido')?.addEventListener('click', async () => {
        const id = parseInt(document.getElementById('consumoMesaId').value);
        const m = mesas.find(item => item.id === id);
        if (!m) return;

        const lancamento = parseFloat(document.getElementById('lancamentoValor').value) || 0;
        if (lancamento <= 0) {
            mostrarNotificacao('Informe um valor de lançamento maior que zero!', 'error');
            return;
        }

        const btn = document.getElementById('btnAdicionarLancamentoRapido');
        btn.disabled = true;
        btn.textContent = '...';

        const novoValor = m.valor_acumulado + lancamento;
        const novoStatus = m.status === 'livre' ? 'ocupada' : m.status;

        try {
            const { error } = await supabaseClient
                .from('mesas_comandas')
                .update({
                    status: novoStatus,
                    valor_acumulado: novoValor
                })
                .eq('id', id);

            if (error) throw error;

            m.valor_acumulado = novoValor;
            m.status = novoStatus;

            document.getElementById('consumoValorTotal').textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(novoValor);
            document.getElementById('consumoStatus').value = novoStatus;
            document.getElementById('lancamentoValor').value = '';

            const btnCheckout = document.getElementById('btnLancarVendaMesa');
            if (btnCheckout) {
                btnCheckout.style.display = 'inline-block';
            }

            mostrarNotificacao('Lançamento adicionado!', 'success');
            carregarMesas();

        } catch (error) {
            console.error('Erro ao adicionar lançamento:', error);
            mostrarNotificacao('Erro ao adicionar lançamento', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '➕ Lançar';
        }
    });

    // =====================================================
    // EVENTOS
    // =====================================================
    document.getElementById('btnNovaMesa')?.addEventListener('click', () => {
        document.getElementById('modalMesa').style.display = 'flex';
        document.getElementById('numero').focus();
    });

    document.getElementById('btnSalvarMesa')?.addEventListener('click', salvarMesa);
    document.getElementById('btnAtualizarConsumo')?.addEventListener('click', atualizarConsumo);

    document.getElementById('btnCancelarModal')?.addEventListener('click', () => {
        document.getElementById('modalMesa').style.display = 'none';
    });
    document.getElementById('btnCancelarConsumo')?.addEventListener('click', () => {
        document.getElementById('modalConsumo').style.display = 'none';
    });

    document.querySelectorAll('.close, #closeConsumo').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('modalMesa').style.display = 'none';
            document.getElementById('modalConsumo').style.display = 'none';
        });
    });

    // Filtros
    document.getElementById('filtroTipo')?.addEventListener('change', renderizarMesas);
    document.getElementById('filtroStatus')?.addEventListener('change', renderizarMesas);

    window.onclick = (event) => {
        if (event.target === document.getElementById('modalMesa')) {
            document.getElementById('modalMesa').style.display = 'none';
        }
        if (event.target === document.getElementById('modalConsumo')) {
            document.getElementById('modalConsumo').style.display = 'none';
        }
    };

    // Inicializar
    carregarMesas();
});
