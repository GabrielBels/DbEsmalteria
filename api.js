const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const express = require('express');
const app = express();

const nomeEmpresa = "EsmalteriaMi";

//#region Express APIs
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.get('/GetCliente', async (req, res) => {
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


app.listen(8001, () => {
    console.log('\nApp escutando na porta: localhost' + ':' + 8001)
})
//#endregion

//#region Database

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

async function getVendasCliente(nomeCliente) {
    return new Promise((resolve, reject) => {

        let db = new sqlite3.Database(`./${nomeEmpresa.toLowerCase()}.db`);

        let sql = `SELECT * FROM WhatsAppMensagem NOLOCK WHERE IsFromMe = 'false' AND IdMensagem <> '' AND Numero = '${number}'`;

        db.all(sql, [], (err, rows) => {
            if (err) throw err;

            return rows;
        });

        // close the database connection
        db.close();
    });
}


async function insertVenda(number, message, isFromMe, idMensagem) {
    let db = new sqlite3.Database(`./${nomeEmpresa.toLowerCase()}.db`);

    db.run(`INSERT INTO WHATSAPPMENSAGEM (Mensagem, Numero, DataHora, IsFromMe, IdMensagem) VALUES ('${message}', '${number}', '${Date.now()}', '${isFromMe}', '${idMensagem}')`);

    db.close();

    return;
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

function getCliente(nomeCliente) {
    return new Promise((resolve, reject) => {

        const db = new sqlite3.Database(`./${nomeEmpresa.toLowerCase()}.db`);

        const sql = `SELECT CodCliente, Nome FROM Cliente NOLOCK WHERE Nome = '${nomeCliente}'`;

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

createDatabaseAndTables();
//#endregion