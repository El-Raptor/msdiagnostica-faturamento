export async function getFaturamento() {
    const query = `
        WITH 
        PARCID AS (
            SELECT 
                PAR.CODPARC
                , PAR.NOMEPARC
                , CID.NOMECID
            FROM TGFPAR PAR
            JOIN TSICID CID ON PAR.CODCID = CID.CODCID
        ),
        VENDAS AS (
            SELECT 
                CAB.NUNOTA
                , CAB.DTNEG
                , CAB.CODPARC
                , CAB.VLRNOTA
                , CAB.TIPMOV
                , TPO.GOLDEV
                , TO_CHAR(CAB.DTNEG, 'YYYYMM') AS MES_ANO
            FROM
                TGFCAB CAB
                JOIN TGFTOP TPO ON CAB.CODTIPOPER = TPO.CODTIPOPER
                            AND CAB.DHTIPOPER = TPO.DHALTER
            WHERE
                TPO.GOLSINAL = -1
                AND CAB.STATUSNOTA = 'L'
                AND CAB.DTNEG BETWEEN ADD_MONTHS(TRUNC(SYSDATE, 'MONTH'), -2) AND ADD_MONTHS(TRUNC(SYSDATE, 'MONTH'), +1) -1
        )
        SELECT SUM (VEN.VLRNOTA * VEN.GOLDEV) AS VLRTOT
            , PAR.NOMECID
            , PAR.NOMEPARC
            , VEN.MES_ANO
        FROM VENDAS VEN
        RIGHT JOIN PARCID PAR ON VEN.CODPARC = PAR.CODPARC
        GROUP BY PAR.NOMECID
                , PAR.NOMEPARC
                , VEN.MES_ANO
        ORDER BY VEN.MES_ANO, PAR.NOMECID, PAR.NOMEPARC
    `;

    
}