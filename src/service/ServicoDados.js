"use strict";

export class ServicoDados {
  static definirExecutor(funcaoExecutor) {
    this.executor = funcaoExecutor;
  }

  static async post(
    url,
    corpo,
    { headers, raw } = { headers: {}, raw: false },
  ) {
    let isJSON = true;

    if (headers) {
      const cabecalhoTipoOriginal = headers["Content-Type"]
        ? String(headers["Content-Type"])
        : "application/json; charset=UTF-8";
      isJSON = headers["Content-Type"]
        ? RegExp(/json/i).exec(headers["Content-Type"])
        : isJSON;
      if (headers["Content-Type"]) delete headers["Content-Type"];
      headers["Content-Type"] = cabecalhoTipoOriginal;
    }

    try {
      let corpoRequisicaoFormatado = corpo;
      if (corpo && typeof corpo === "object") {
        corpoRequisicaoFormatado = JSON.stringify(corpo);
      }

      if (typeof window === "undefined" || !window.fetch) {
        throw new Error("Requer ambiente de navegador com 'fetch'.");
      }

      const resposta = await window.fetch.bind(window)(url, {
        headers,
        method: "POST",
        redirect: "follow",
        credentials: "include",
        body: corpoRequisicaoFormatado,
      });

      if (raw) return resposta;
      return isJSON ? resposta.json() : resposta.text();
    } catch (erro) {
      console.error("[JSK] Erro no POST:", erro);
      throw erro;
    }
  }

  static normalizarResposta(valorBruto) {
    try {
      const valorParseado =
        typeof valorBruto === "string" ? JSON.parse(valorBruto) : valorBruto;
      if (!valorParseado) return [];
      if (Array.isArray(valorParseado)) return valorParseado;

      let dadosFinais = null;
      if (typeof valorParseado === "object") {
        if (typeof valorParseado.b === "string") {
          dadosFinais = JSON.parse(valorParseado.b);
        } else if (
          valorParseado.c?.b &&
          typeof valorParseado.c.b === "string"
        ) {
          dadosFinais = JSON.parse(valorParseado.c.b);
        } else if (
          valorParseado.data?.responseBody ||
          valorParseado.responseBody
        ) {
          const corpo =
            valorParseado.data?.responseBody || valorParseado.responseBody;
          dadosFinais = typeof corpo === "string" ? JSON.parse(corpo) : corpo;
        }
      }
      if (Array.isArray(dadosFinais)) return dadosFinais;
      throw new Error("Formato de resposta inválido.");
    } catch (erro) {
      throw new Error(`Erro ao normalizar resposta: ${erro.message}`);
    }
  }

  static async consultar(query, params = null) {
    const executor =
      this.executor ||
      (typeof window !== "undefined" ? window.executeQuery : null);

    if (typeof executor !== "function") {
      return Promise.reject(
        new Error("Executor 'executeQuery' não encontrado."),
      );
    }

    return new Promise((resolve, reject) => {
      executor(
        query,
        params,
        (valorBruto) => {
          try {
            const dados = ServicoDados.normalizarResposta(valorBruto);
            resolve(dados || []);
          } catch (err) {
            reject(err);
          }
        },
        (err) => reject(new Error(`Erro na query: ${err}`)),
      );
    });
  }

  static async consultarPaginado(query, params = null, limite, offset) {
    const limiteSeguro = Number(limite);
    const offsetSeguro = Number(offset);
    if (isNaN(limiteSeguro) || isNaN(offsetSeguro) || limiteSeguro < 0)
      throw new Error("Parâmetros de paginação inválidos.");

    const queryPaginada = `${query} LIMIT ${limiteSeguro} OFFSET ${offsetSeguro}`;
    const dados = await ServicoDados.consultar(queryPaginada, params);
    const paginaAtual = Math.floor(offsetSeguro / limiteSeguro) + 1;

    return {
      dados,
      meta: {
        paginaAtual,
        itensPorPagina: limiteSeguro,
        totalItens: null,
        totalPaginas: null,
      },
    };
  }

  /**
   * Metodo Salvar
   */
  static async salvar(dados, entidade, chavesPrimarias = null) {
    const url = `${window.location.origin}/mge/service.sbr?serviceName=DatasetSP.save&outputType=json`;
    const chavesDados = Object.keys(dados);
    const fields = chavesDados.map((campo) => campo.toUpperCase());
    const values = {};

    chavesDados.forEach((chave, indice) => {
      values[indice.toString()] = String(dados[chave]);
    });

    const record = { values: values };
    if (chavesPrimarias) {
      const pk = {};
      Object.keys(chavesPrimarias).forEach(
        (chave) => (pk[chave.toUpperCase()] = String(chavesPrimarias[chave])),
      );
      record.pk = pk;
    }

    return await ServicoDados.post(url, {
      serviceName: "DatasetSP.save",
      requestBody: { entityName: entidade, fields: fields, records: [record] },
    });
  }

  /**
   * Metodo Excluir
   */
  static async excluir(entidade, chavesPrimarias) {
    const url = `${window.location.origin}/mge/service.sbr?serviceName=DatasetSP.removeRecord&outputType=json`;

    return ServicoDados.post(url, {
      serviceName: "DatasetSP.removeRecord",
      requestBody: {
        entityName: entidade,
        pks: Array.isArray(chavesPrimarias)
          ? chavesPrimarias
          : [chavesPrimarias],
      },
    });
  }

  /**
   * Consulta um único registro pela Chave Primária (loadRecord)
   */
  static async consultarRegistro(entidade, chaves, campos) {
    const url = `${window.location.origin}/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecord&outputType=json`;

    const rowParams = {};
    for (const [key, value] of Object.entries(chaves)) {
      rowParams[key] = { $: String(value) };
    }

    let entityParam = [];
    if (typeof campos === "string") {
      entityParam.push({ path: "", fieldset: { list: campos } });
    } else if (Array.isArray(campos)) {
      entityParam = campos;
    }

    return await ServicoDados.post(url, {
      serviceName: "CRUDServiceProvider.loadRecord",
      requestBody: {
        dataSet: {
          rootEntity: entidade,
          entity: entityParam,
          rows: { row: rowParams },
        },
      },
    });
  }

  /**
   * Executa uma consulta SQL no banco de dados via API (DbExplorerSP).
   * Suporta a injeção segura de parâmetros substituindo "?" na query original,
   * prevenindo problemas de sintaxe e tratando os tipos de dados adequadamente.
   *
   * @static
   * @async
   * @param {string} query - A instrução SQL a ser executada. Pode conter "?" indicando onde os parâmetros serão injetados.
   * @param {Array<{value: any, type: string}>} [params=null] - (Opcional) Array de objetos com os parâmetros a serem substituídos na query em ordem.
   * @param {any} params[].value - O valor do parâmetro. Se for null/undefined, será injetado 'NULL' no SQL.
   * @param {'S'|'I'|'F'} params[].type - O tipo de dado esperado. 'S' (String, escapa aspas e adiciona aspas simples), 'I' (Inteiro) ou 'F' (Float/Decimal).
   * * @returns {Promise<{resultado: Array<Object>, status: string, statusMessage: string}>} Retorna um objeto contendo o array de resultados formatados (cada linha como um objeto com as chaves sendo o nome das colunas), o status da requisição e a mensagem de retorno.
   * * @example
   * // Exemplo de uso:
   * const sql = "SELECT CODPROD, DESCRPROD FROM TGFPROD WHERE CODGRUPO = ? E DESCRPROD LIKE ?";
   * const parametros = [
   * { value: 1040, type: "I" },
   * { value: "%MANGUEIRA%", type: "S" }
   * ];
   * const resposta = await MinhaClasse.consultarDB(sql, parametros);
   * console.log(resposta.resultado); // [{CODPROD: 10, DESCRPROD: "MANGUEIRA A"}, ...]
   */
  static async consultarDB(query, params = null) {
    const url = `${window.location.origin}/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json`;

    try {
      let queryFormatada = query;

      // Se existirem parâmetros, fazemos a substituição dos "?"
      if (params && Array.isArray(params)) {
        let indexParam = 0;
        
        queryFormatada = query.replace(/\?/g, () => {
          // Se tiver mais '?' do que parâmetros passados, mantém o '?' original
          if (indexParam >= params.length) return '?';

          const param = params[indexParam++];
          const valor = param.value;

          // Se o valor for nulo, injeta NULL no SQL
          if (valor === null || valor === undefined) return 'NULL';

          switch (param.type) {
            case 'S':
              // Escapa aspas simples duplicando-as (ex: d'água -> d''água) - Padrão SQL
              const safeString = String(valor).replace(/'/g, "''");
              return `'${safeString}'`;
            case 'I':
              // Garante que é um número inteiro
              return parseInt(valor, 10);
            case 'F':
              // Garante que é um número decimal
              return parseFloat(valor);
            default:
              return valor;
          }
        });
      }

      const results = await ServicoDados.post(url, {
        serviceName: "DbExplorerSP.executeQuery",
        requestBody: {
          sql: queryFormatada,
        },
      });

      console.log("Query executada:", queryFormatada);
      console.log("Resposta da API:", results);

      if (results?.status !== "1") {
        console.warn(
          "A consulta falhou ou retornou erro:",
          results?.statusMessage,
        );
        return {
          resultado: [],
          status: results?.status,
          statusMessage: results?.statusMessage || "Erro desconhecido na consulta.",
        };
      }

      // Valida se existem linhas e metadados antes de tentar formatar
      const rows = results?.responseBody?.rows || [];
      const fields = results?.responseBody?.fieldsMetadata || [];

      let dadosFormatados = [];

      if (rows.length > 0 && fields.length > 0) {
        dadosFormatados = rows.map((row) =>
          Object.fromEntries(
            row.map((valor, index) => [fields[index].name, valor]),
          ),
        );
      }

      return {
        resultado: dadosFormatados,
        status: results.status,
        statusMessage: results.statusMessage,
      };
    } catch (error) {
      console.error("Erro ao executar consultarDB:", error);
      return {
        resultado: [],
        status: "0",
        statusMessage: "Erro de comunicação com o servidor.",
      };
    }
  }

  /**
   * Consulta múltiplos registros com base em critérios e paginação (loadRecords)
   */
  static async consultarRegistros(
    entidade,
    expressao,
    parametros = [],
    campos = "",
    opcoes = {},
  ) {
    const url = `${window.location.origin}/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json`;

    const formattedParams = parametros.map((p) => ({
      $: String(p.valor),
      type: p.tipo,
    }));

    let entityParam = {};
    if (typeof campos === "string") {
      entityParam = { fieldset: { list: campos } };
    } else if (Array.isArray(campos)) {
      entityParam = campos;
    }

    const dataSet = {
      rootEntity: entidade,
      offsetPage: opcoes.offsetPage || "0",
      ignoreCalculatedFields: opcoes.ignoreCalculatedFields || "false",
      includePresentationFields: opcoes.includePresentationFields || "N",
      useFileBasedPagination: opcoes.useFileBasedPagination || "false",
      tryJoinedFields: opcoes.tryJoinedFields || "false",
      criteria: {
        expression: { $: expressao },
      },
      entity: entityParam,
    };

    if (formattedParams.length > 0) {
      dataSet.criteria.parameter = formattedParams;
    }
    if (opcoes.modifiedSince) {
      dataSet.modifiedSince = opcoes.modifiedSince;
    }

    return await ServicoDados.post(url, {
      serviceName: "CRUDServiceProvider.loadRecords",
      requestBody: { dataSet },
    });
  }

  /**
   * Consulta de Views diretamente no banco de dados (loadView)
   */
  static async consultarView(nomeView, campos, condicaoWhere) {
    const url = `${window.location.origin}/mge/service.sbr?serviceName=CRUDServiceProvider.loadView&outputType=json`;

    return await ServicoDados.post(url, {
      serviceName: "CRUDServiceProvider.loadView",
      requestBody: {
        query: {
          viewName: nomeView,
          fields: { field: { $: campos } },
          where: { $: condicaoWhere },
        },
      },
    });
  }

  /**
   * Metodo novo de faturametno
   */
  static async faturar(nunota, codTipOper, opcoesAdicionais = {}) {
    const url = `${window.location.origin}/mgecom/service.sbr?serviceName=SelecaoDocumentoSP.faturar&outputType=json`;

    const arrayNotas = Array.isArray(nunota)
      ? nunota.map((n) => ({ $: n }))
      : [{ $: nunota }];

    const payloadNotas = {
      codTipOper: codTipOper,
      dtFaturamento: "",
      tipoFaturamento: "FaturamentoNormal",
      dataValidada: true,
      notasComMoeda: {},
      nota: arrayNotas,
      codLocalDestino: "",
      faturarTodosItens: true,
      umaNotaParaCada: "false",
      ehWizardFaturamento: true,
      dtFixaVenc: "",
      ehPedidoWeb: false,
      nfeDevolucaoViaRecusa: false,
      ...opcoesAdicionais,
    };

    return await ServicoDados.post(url, {
      serviceName: "SelecaoDocumentoSP.faturar",
      requestBody: {
        notas: payloadNotas,
      },
    });
  }

  static getUrl(path) {
    return `${window.location.origin}${path ? "/" + path.replace("/", "") : ""}`;
  }

  static async removerFrame(
    { nuGdt, paginaInicial, ...opcoes } = {
      nuGdt: 0,
      paginaInicial: "app.jsp",
    },
  ) {
    const o = await new Promise((resolve) => {
      [window.parent.document, window.parent.parent.document].forEach((doc) => {
        if (doc && doc.getElementsByTagName("body").length) {
          const alertBox = doc.querySelector(
            "div.gwt-PopupPanel.alert-box.box-shadow",
          );
          if (alertBox) alertBox.style.display = "none";
          doc.getElementsByTagName("body")[0].style.overflow = "hidden";
        }
      });

      resolve({ gadGetID: "html5_z6dld", nuGdt: nuGdt || 0, ...opcoes });
    });
    return setTimeout(() => {
      if (
        typeof window.parent.document.getElementsByClassName("DashWindow")[0] !=
        "undefined"
      ) {
        const opcoesUrl = Object.keys(o)
          .filter(
            (item) =>
              !["params", "UID", "instance", "nuGdg", "gadGetID"].includes(
                item,
              ),
          )
          .map((item_1) => `&${item_1}=${o[item_1]}`)
          .join("");

        const url = `/mge/html5component.mge?entryPoint=${paginaInicial}&nuGdg=${o.nuGdt}${opcoesUrl}`;

        const gadgetDiv =
          window.parent.document.getElementsByClassName("dyna-gadget")[0];
        if (gadgetDiv) {
          gadgetDiv.innerHTML = `<iframe src="${url}" class="gwt-Frame" style="width: 100%; height: 100%;"></iframe>`;
        }

        const popup = document.getElementsByClassName("popupContent")[0];
        if (popup && popup.parentElement) popup.parentElement.remove();

        const styleEl = document.getElementById("stndz-style");
        if (
          styleEl &&
          styleEl.parentElement &&
          styleEl.parentElement.parentElement
        ) {
          styleEl.parentElement.parentElement.getElementsByTagName(
            "body",
          )[0].style.overflow = "hidden";
        }
      }
    }, 500);
  }

  static novaGuia(forcado = false) {
    const isSankhya =
      !!window.parent.parent.document.querySelector(".Taskbar-container");
    if ((isSankhya && !forcado) || forcado) {
      Object.assign(document.createElement("a"), {
        target: "_blank",
        href: window.location.href,
      }).click();
    }
  }

  static abrirPagina(resourceID, chavesPrimarias) {
    let url = ServicoDados.getUrl(`/mge/system.jsp#app/%resID`);
    url = url.replace("%resID", btoa(resourceID));

    if (chavesPrimarias) {
      let body = {};
      Object.keys(chavesPrimarias).forEach(
        (k) =>
          (body[k] = isNaN(chavesPrimarias[k])
            ? String(chavesPrimarias[k])
            : Number(chavesPrimarias[k])),
      );
      url = url.concat(`/${btoa(JSON.stringify(body))}`);
    }

    Object.assign(document.createElement("a"), {
      target: "_top",
      href: url,
    }).click();
  }

  static fecharPagina() {
    const closeBtn = window.parent.parent.document.querySelector(
      "li.ListItem.AppItem.AppItem-selected div.Taskbar-icon.icon-close",
    );
    if (closeBtn) closeBtn.click();
    else window.close();
  }
}
