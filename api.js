const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const express = require('express');
const app = express();

const nomeEmpresa = "EsmalteriaMi";

//#region Express APIs
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

//#region APIs Cliente
app.get('/GetCadastraCliente', async (req, res) => {
    try {
        const request = req.query;


        if (!request.nomeCliente)
            return res.status(400).json({ sucess: false, message: "Nome do cliente não informado!" });

        getCreateCliente(request.nomeCliente)
            .then((result) => {
                console.log(result);
                return res.status(200).json({ sucess: true, data: result })
            })
            .catch((error) => {
                throw error;
            });
    } catch (ex) {
        return res.status(500).json({ sucess: false, message: "Erro interno ao buscar cliente!" });
    }
});

app.get('/GetCliente', async (req, res) => {
    try {
        const request = req.query;

        if (!request.nomeCliente)
            return res.status(400).json({ sucess: false, message: "Nome do cliente não informado!" });

        getCliente(request.nomeCliente)
            .then((result) => {
                console.log(result);
                return res.status(200).json({ sucess: true, data: result })
            })
            .catch((error) => {
                throw error;
            });
    } catch (ex) {
        return res.status(500).json({ sucess: false, message: "Erro interno ao buscar cliente!" });
    }
});

//#endregion


//#region APIs Venda
app.post('/Venda', async (req, res) => {
    try {
        const request = req.body;

        const { codCliente, dataVenda, formaPagamento, numParcelas, valorTotal, listaProdutos } = request;

        // console.log(codCliente);
        // console.log(dataVenda);
        // console.log(formaPagamento);
        // console.log(valorTotal);
        // console.log(numParcelas);
        // console.log(listaProdutos);

        if (!codCliente)
            return res.status(400).json({ sucess: false, message: "Código do cliente não informado!" });

        if (!dataVenda || (new Date(dataVenda)).getTime() <= 0)
            return res.status(400).json({ sucess: false, message: "Data da Venda inválida ou não informada!" });

        if (!formaPagamento)
            return res.status(400).json({ sucess: false, message: "Forma de Pagamento não informada!" });

        if (!numParcelas)
            return res.status(400).json({ sucess: false, message: "Número de parcelas não informado!" });

        if (!valorTotal)
            return res.status(400).json({ sucess: false, message: "Valor total não informado!" });

        if (!listaProdutos || listaProdutos.length < 1)
            return res.status(400).json({ sucess: false, message: "Lista de produtos vazia!" });
        else if (listaProdutos.some((el) => !el.qtd || !el.valorUnitario || !el.valorTotal))
            return res.status(400).json({ sucess: false, message: "Lista de produtos possui produto com qtd ou valor zerado!" });

        insertTbVenda(codCliente, dataVenda, formaPagamento, numParcelas, valorTotal)
            .then((result) => {
                console.log(result);

                insertTbVendaProduto(result, listaProdutos).then(() => {
                    return res.status(200).json({ sucess: true, codVenda: result })
                }).catch((exx) => {
                    throw exx;
                })
            })
            .catch((error) => {
                throw error;
            });
    } catch (ex) {
        console.log('error: ' + ex)

        return res.status(500).json({ sucess: false, message: ex });
    }
});

app.get('/Venda', async (req, res) => {
    try {
        const { codCliente } = req.query;

        getListaVendas(codCliente)
            .then((result) => {
                const listaProdutos = result.reduce((acc, curr, i, arr) => {

                    const { NomeProduto, Quantidade, ValorUnidade,
                        CodVendaProduto, ValorTotal, ...restData } = curr;

                    restData.ListaProdutos = [{
                        CodVendaProduto: CodVendaProduto,
                        NomeProduto: NomeProduto,
                        Quantidade: Quantidade,
                        ValorUnidade: ValorUnidade,
                        ValorTotal: ValorTotal
                    }];

                    const objVenda = acc.filter(x => x.CodVenda == curr.CodVenda)

                    if (objVenda && objVenda.length > 0)
                        objVenda[0].ListaProdutos = [...objVenda[0].ListaProdutos, restData.ListaProdutos[0]];
                    else
                        acc = [...acc, restData];

                    return acc;
                }, []);

                return res.status(200).json({ sucess: true, data: listaProdutos })
            })
            .catch((error) => {
                throw error;
            });
    } catch (ex) {
        console.log('error: ' + ex)

        return res.status(500).json({ sucess: false, message: ex });
    }
});

//#endregion


app.listen(8001, () => {
    console.log('\nApp escutando na porta: localhost' + ':' + 8001)
})
//#endregion

//#region Database

//#region Create tables if not exists
async function createDatabaseAndTables() {
    let db = new sqlite3.Database(`./${nomeEmpresa.toLowerCase()}.db`);

    db.run(`CREATE TABLE IF NOT EXISTS "Cliente" (
        "CodCliente"	INTEGER NOT NULL,
        "Nome"	TEXT NOT NULL,
        PRIMARY KEY("CodCliente" AUTOINCREMENT)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS "Venda" (
        "CodVenda"	INTEGER NOT NULL,
        "CodCliente"	INTEGER NOT NULL,
        "DataVenda"	TEXT NOT NULL,
        "FormaPagto"	TEXT NOT NULL,
        "QtdParcelas"	INTEGER NOT NULL DEFAULT 1,
        "ValorTotal"	NUMERIC NOT NULL DEFAULT 0,
        PRIMARY KEY("CodVenda" AUTOINCREMENT)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS "VendaProduto" (
        "CodVendaProduto"	INTEGER NOT NULL,
        "CodVenda"	INTEGER NOT NULL,
        "Quantidade"	INTEGER NOT NULL,
        "NomeProduto"	TEXT NOT NULL,
        "ValorUnidade"	NUMERIC NOT NULL DEFAULT 0,
        "ValorTotal"	NUMERIC NOT NULL DEFAULT 0,
        PRIMARY KEY("CodVendaProduto" AUTOINCREMENT)
    )`);

    db.close();

    return;
}
//#endregion 

//#region Selects
function getListaVendas(codCliente) {
    return new Promise((resolve, reject) => {

        let db = new sqlite3.Database(`./${nomeEmpresa.toLowerCase()}.db`);

        const sql = `SELECT * FROM Venda V 
                    INNER JOIN VendaProduto VP ON VP.CodVenda = V.CodVenda`
            + (!codCliente ? "" : ` WHERE V.CodCliente = ${codCliente}`);

        db.all(sql, [], (err, rows) => {
            if (err) reject(err);

            resolve(rows)
        });

        // close the database connection
        db.close();
    });
}

function getCliente(nomeCliente) {
    return new Promise((resolve, reject) => {

        const db = new sqlite3.Database(`./${nomeEmpresa.toLowerCase()}.db`);

        const sql = `SELECT CodCliente, Nome FROM Cliente NOLOCK WHERE Nome LIKE '${nomeCliente}%'`;

        db.all(sql, [], (err, rows) => {

            if (err) reject(err);
            resolve(rows);
        });
        db.close();
    });

}

async function getCreateCliente(nomeCliente, isRetry) {

    let cliente = await getCliente(nomeCliente);

    if (!isRetry && (!cliente || cliente.length < 1)) {
        cliente = await insertCliente(nomeCliente);
    }

    return cliente;
}
//#endregion 

//#region Inserts
function insertTbVenda(codCliente, dataVenda, formaPagto, qtdParcelas, valorTotal) {
    return new Promise((resolve, reject) => {

        let db = new sqlite3.Database(`./${nomeEmpresa.toLowerCase()}.db`);

        db.run(`INSERT INTO Venda (CodCliente, DataVenda, FormaPagto, QtdParcelas, ValorTotal) VALUES (?,?,?,?,?)`, [codCliente, dataVenda, formaPagto, qtdParcelas, valorTotal],
            function (err) {
                if (err) reject(err);

                resolve(this.lastID);
            });

        db.close();

        return;
    });
}

function insertTbVendaProduto(codVenda, listaProdutos) {
    return new Promise((resolve, reject) => {

        let db = new sqlite3.Database(`./${nomeEmpresa.toLowerCase()}.db`);

        const sqlProdutos = listaProdutos.map((el) => `(${codVenda}, ${el.qtd}, '${el.nome}', ${el.valorUnitario}, ${el.valorTotal})`).join(",");

        db.run(`INSERT INTO VendaProduto (CodVenda, Quantidade, NomeProduto, ValorUnidade, ValorTotal) VALUES ${sqlProdutos}`,
            function (err) {
                if (err) reject(err);

                resolve(this.lastID);
            });

        db.close();

        return;
    });
}

function insertCliente(nomeCliente) {
    return new Promise((resolve, reject) => {
        let db = new sqlite3.Database(`./${nomeEmpresa.toLowerCase()}.db`);

        db.run(`INSERT INTO CLIENTE (Nome) VALUES ('${nomeCliente}')`);

        const sql = `SELECT CodCliente, Nome FROM Cliente NOLOCK WHERE Nome = '${nomeCliente}'`;

        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });

        db.close();
    });
}
//#endregion

createDatabaseAndTables();
//#endregion