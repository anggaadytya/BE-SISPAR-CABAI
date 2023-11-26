const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT;

// Middleware
app.use(cors());

app.use(express.json());

// MySQL Connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: process.env.DB,
});

function calculateSimilarity(problem, weights) {
  let numerator = 0;
  let denominator = weights.reduce((acc, curr) => acc + curr, 0);

  if (denominator === 0) {
    return 0;
  }

  for (let i = 0; i < problem.length; i++) {
    numerator += problem[i] * weights[i];
  }

  const similarity = numerator / denominator;

  return similarity;
}

async function generateNewBasiskasusId(conn) {
  try {
    const query =
      "SELECT MAX(CAST(SUBSTRING(id_basiskasus, 4) AS UNSIGNED)) AS maxId FROM basiskasus";
    const result = await conn.query(query);
    const maxId = result[0].maxId;

    if (maxId === null) {
      return "BK-001";
    } else {
      const newNumericPart = maxId + 1;
      const paddedNumericPart = String(newNumericPart).padStart(3, "0");
      return "BK-" + paddedNumericPart;
    }
  } catch (err) {
    console.error("Error generating new basiskasus id:", err);
    throw err;
  }
}

//////////////////////////////////////////////////////////////////
///////////// Route untuk data dari tabel "user" /////////////////
//////////////////////////////////////////////////////////////////
app.get("/api/users", (req, res) => {
  const query = "SELECT * FROM user";

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    res.json(results);
  });
});

//////////////////////////////////////////////////////////////////
///////////// Route untuk data dari tabel "gejala" ///////////////
//////////////////////////////////////////////////////////////////

app.get("/api/gejala", (req, res) => {
  const query = "SELECT * FROM gejala";

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
    res.json(results);
  });
});

app.delete("/api/gejala/:id", (req, res) => {
  const id_gejala = req.params.id_gejala;

  const queryCheckRelation = `SELECT * FROM basiskasus WHERE id_gejala = ?`;
  connection.query(queryCheckRelation, [id_gejala], (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (results.length > 0) {
      return res.status(400).json({
        error:
          "Data gejala memiliki relasi dengan data lain. Tidak dapat dihapus.",
      });
    } else {
      const deleteQuery = "DELETE FROM gejala WHERE id_gejala = ?";
      connection.query(deleteQuery, [id_gejala], (err, results) => {
        if (err) {
          console.error("Error deleting data:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        res.status(200).json({ message: "Data gejala berhasil dihapus" });
      });
    }
  });
});

app.put("/api/gejala/:id", (req, res) => {
  const gejalaId = req.params.id;
  const { nama_gejala, bobot } = req.body;
  const query = "UPDATE gejala SET nama_gejala=?, bobot=? WHERE id_gejala=?";

  connection.query(query, [nama_gejala, bobot, gejalaId], (err, results) => {
    if (err) {
      console.error("Error updating data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Data gejala not found" });
    }

    res.json({ message: "Data gejala berhasil diperbarui" });
  });
});

app.post("/api/gejala", (req, res) => {
  const { nama_gejala, bobot } = req.body;
  if (!nama_gejala || !bobot) {
    return res
      .status(400)
      .json({ error: "Nama gejala dan bobot harus diisi." });
  }

  const queryGetLastGejalaNumber =
    "SELECT max(id_gejala) as lastGejalaNumber FROM gejala";
  connection.query(queryGetLastGejalaNumber, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    const lastGejalaNumber = results[0].lastGejalaNumber;
    let kodeGejala;

    if (!lastGejalaNumber) {
      kodeGejala = "G-01";
    } else {
      const urutan = parseInt(lastGejalaNumber.slice(2)) + 1;
      kodeGejala = `G-${urutan.toString().padStart(2, "0")}`;
    }

    const insertQuery =
      "INSERT INTO gejala (id_gejala, nama_gejala, bobot) VALUES (?, ?, ?)";
    connection.query(
      insertQuery,
      [kodeGejala, nama_gejala, bobot],
      (err, results) => {
        if (err) {
          console.error("Error inserting data:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        res.status(201).json({ id_gejala: kodeGejala, nama_gejala, bobot });
      }
    );
  });
});

//////////////////////////////////////////////////////////////////
///////////// Route untuk data dari tabel "hapen" ////////////////
//////////////////////////////////////////////////////////////////

app.get("/api/hapen", (req, res) => {
  const query = "SELECT * FROM hapen";

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
    res.json(results);
  });
});

app.delete("/api/hapen/:id", (req, res) => {
  const hapenId = req.params.id;
  const query = "DELETE FROM hapen WHERE id_hapen = ?";

  connection.query(query, [hapenId], (err, results) => {
    if (err) {
      console.error("Error deleting data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    res.json({ message: "Data hapen berhasil dihapus" });
  });
});

app.put("/api/hapen/:id", (req, res) => {
  const hapenId = req.params.id;
  const { nama_hapen, detail, solusi } = req.body;
  const query =
    "UPDATE hapen SET nama_hapen=?, detail=?, solusi=? WHERE id_hapen=?";

  connection.query(
    query,
    [nama_hapen, detail, solusi, hapenId],
    (err, results) => {
      if (err) {
        console.error("Error updating data:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      res.json({ message: "Data hapen berhasil diperbarui" });
    }
  );
});

app.post("/api/hapen", (req, res) => {
  const { nama_hapen, detail, solusi } = req.body;
  if (!nama_hapen || !detail || !solusi) {
    return res
      .status(400)
      .json({ error: "Nama hapen ,detail dan solusi harus diisi." });
  }

  const queryGetLastGejalaNumber =
    "SELECT max(id_hapen) as lastGejalaNumber FROM hapen";
  connection.query(queryGetLastGejalaNumber, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    const lastGejalaNumber = results[0].lastGejalaNumber;
    let kodeGejala;

    if (!lastGejalaNumber) {
      kodeGejala = "HP-01";
    } else {
      const urutan = parseInt(lastGejalaNumber.slice(3)) + 1;
      kodeGejala = `HP-${urutan.toString().padStart(2, "0")}`;
    }

    const insertQuery =
      "INSERT INTO hapen (id_hapen, nama_hapen, detail, solusi) VALUES (?, ?, ?, ?)";
    connection.query(
      insertQuery,
      [kodeGejala, nama_hapen, detail, solusi],
      (err, results) => {
        if (err) {
          console.error("Error inserting data:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        }
        res
          .status(201)
          .json({ id_hapen: kodeGejala, nama_hapen, detail, solusi });
      }
    );
  });
});

//////////////////////////////////////////////////////////////////
/////////// Route untuk data dari tabel "basiskasus"//////////////
//////////////////////////////////////////////////////////////////

app.get("/api/basiskasus", (req, res) => {
  const query = `SELECT basiskasus.id_basiskasus, hapen.id_hapen, hapen.nama_hapen, GROUP_CONCAT(gejala.nama_gejala) AS namaGejala, 
                GROUP_CONCAT(gejala.id_gejala) AS idGejala, GROUP_CONCAT(basiskasus.bobot) AS bobots
                FROM basiskasus INNER JOIN hapen ON basiskasus.id_hapen = hapen.id_hapen
                INNER JOIN gejala ON basiskasus.id_gejala = gejala.id_gejala GROUP BY basiskasus.id_basiskasus, hapen.id_hapen
                ORDER BY basiskasus.id_basiskasus;`;
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
    res.json(results);
  });
});

app.delete("/api/basiskasus/:id", (req, res) => {
  const basiskasusId = req.params.id;
  const query = "DELETE FROM basiskasus WHERE id_basiskasus = ?";

  connection.query(query, [basiskasusId], (err, results) => {
    if (err) {
      console.error("Error deleting data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    res.json({ message: "Data basiskasus berhasil dihapus" });
  });
});

app.put("/api/basiskasus/:id", (req, res) => {
  const id_basiskasus = req.params.id;
  const { id_hapen, id_gejala } = req.body;

  if (!id_hapen || !Array.isArray(id_gejala) || id_gejala.length === 0) {
    return res.status(400).json({ message: "Invalid data format" });
  }

  const gejalaString = id_gejala.slice(", ");
  let values = id_gejala.map((gejala) => [id_basiskasus, id_hapen, gejala]);

  const updateQuery =
    "UPDATE basiskasus SET id_hapen = ?, id_gejala = ? WHERE id_basiskasus = ?";
  connection.query(
    updateQuery,
    [id_hapen, gejalaString, id_basiskasus],
    (err, result) => {
      if (err) {
        console.error("Error updating data:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Basis kasus tidak ditemukan" });
      }

      res.json({ message: "Data basis kasus berhasil diupdate" });
    }
  );
});

app.post("/api/basiskasus", (req, res) => {
  const { id_hapen, gejalaData } = req.body;

  if (!id_hapen || gejalaData.length === 0) {
    return res.status(400).json({ message: "Invalid data format" });
  }

  const lastIdQuery =
    "SELECT id_basiskasus FROM basiskasus ORDER BY id_basiskasus DESC LIMIT 1";
  connection.query(lastIdQuery, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    let id_basiskasus;
    if (results.length > 0) {
      const lastId = results[0].id_basiskasus;
      id_basiskasus = parseInt(lastId.slice(3)) + 1;
      id_basiskasus = `BK-${id_basiskasus.toString().padStart(3, "0")}`;
    } else {
      id_basiskasus = "BK-001";
    }

    let values = gejalaData.map(({ id_gejala, bobot }) => [
      id_basiskasus,
      id_hapen,
      id_gejala,
      bobot,
    ]);
    const insertQuery =
      "INSERT INTO basiskasus (id_basiskasus, id_hapen, id_gejala, bobot) VALUES ?";
    connection.query(insertQuery, [values], (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      res.json({
        message: "Data basis kasus berhasil ditambahkan",
        id_basiskasus,
      });
    });
  });
});

//////////////////////////////////////////////////////////////////
///////////// Route untuk data dari tabel "deteksi"///////////////
//////////////////////////////////////////////////////////////////
app.get("/api/last-deteksi-number", (req, res) => {
  const queryGetLastDeteksiNumber =
    "SELECT max(id_deteksi) as lastDeteksiNumber FROM deteksi";

  connection.query(queryGetLastDeteksiNumber, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    const lastDeteksiNumber = results[0].lastDeteksiNumber;
    if (!lastDeteksiNumber) {
      // Jika lastDeteksiNumber null, berikan nomor urutan awal
      const urutan = 1;
      const kodeDeteksi = `ND${urutan.toString().padStart(4, "0")}`;
      return res.json({ kodeDeteksi });
    }

    const urutan = parseInt(lastDeteksiNumber.slice(-4)) + 1;
    const kodeDeteksi = `ND${urutan.toString().padStart(4, "0")}`;

    res.json({ kodeDeteksi });
  });
});

app.get("/api/deteksi/:id_deteksi", (req, res) => {
  const idDeteksi = req.params.id_deteksi;

  // SQL query untuk melakukan JOIN dan mendapatkan data deteksi berdasarkan id_deteksi
  const query = `
    SELECT *
    FROM deteksi
    JOIN basiskasus ON deteksi.id_basiskasus = basiskasus.id_basiskasus
    JOIN hapen ON basiskasus.id_hapen = hapen.id_hapen
    WHERE id_deteksi = ?
  `;

  connection.query(query, [idDeteksi], (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Data deteksi tidak ditemukan" });
    }

    // Mengirim data deteksi sebagai response
    res.json(results);
  });
});

app.post("/api/deteksi", (req, res) => {
  const { id_deteksi, gejala } = req.body;
  let idHapen;
  let resultGabungan;

  const formattedGejalaArray = gejala.map((id) => `'${id}'`);
  const formattedGejalaString = formattedGejalaArray.join(",");
  const query =
    "SELECT nama_gejala FROM gejala WHERE id_gejala IN (" +
    formattedGejalaString +
    ") LIMIT 0, 25";

  connection.query(query, (err, resultGejala) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }
    const namaGejalaArray = resultGejala.map((gejala) => gejala.nama_gejala);
    resultGabungan = namaGejalaArray.join(",");
  });

  // mengecek data gejala jika sama 1 dan jika salah 0 dan menjumlah kan bobot berdasarkan id_basiskasus
  const dataQuery = "SELECT * FROM basiskasus";

  connection.query(dataQuery, (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    const dataGejala = result.map((row) => ({
      id_kasus: row.id_basiskasus,
      id_gejala: row.id_gejala,
      bobot: row.bobot,
    }));

    const hasilPerbandingan = {};
    const bobots = {};

    dataGejala.forEach((gejalaData) => {
      const { id_kasus, id_gejala, bobot } = gejalaData;

      if (gejala.includes(id_gejala)) {
        if (!hasilPerbandingan[id_kasus]) {
          hasilPerbandingan[id_kasus] = [];
        }
        hasilPerbandingan[id_kasus].push(1);
      } else {
        if (!hasilPerbandingan[id_kasus]) {
          hasilPerbandingan[id_kasus] = [];
        }
        hasilPerbandingan[id_kasus].push(0);
      }

      if (!bobots[id_kasus]) {
        bobots[id_kasus] = [];
      }

      bobots[id_kasus].push(bobot);
    });

    let nilaiSimilarityTerbesar = 0;
    let idKasusTerbesar = "";

    for (const idKasus in hasilPerbandingan) {
      const nilaiGejala = hasilPerbandingan[idKasus];
      const bobotKasus = bobots[idKasus];
      const hasil = calculateSimilarity(nilaiGejala, bobotKasus);

      if (hasil > nilaiSimilarityTerbesar) {
        nilaiSimilarityTerbesar = hasil;
        idKasusTerbesar = idKasus;
      }
    }

    const queryHapen = `SELECT basiskasus.id_hapen FROM basiskasus WHERE basiskasus.id_basiskasus = '${idKasusTerbesar}'`;
    connection.query(queryHapen, (err, resultHapen) => {
      if (err) {
        console.error("Error fetching data:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (resultHapen.length > 0) {
        const rowHapen = resultHapen[0];
        idHapen = rowHapen.id_hapen;

        // Memasukkan basis kasus yang baru jika similarity lebih keril dari 0,4
        if (nilaiSimilarityTerbesar < 0.4) {
          const newBasiskasusId = generateNewBasiskasusId(connection);
          gejala.forEach((gejalaId) => {
            const insertGejala = `INSERT INTO basiskasus (id_basiskasus, id_hapen, id_gejala) VALUES ('${newBasiskasusId}', '${idHapen}', '${gejalaId}')`;
            connection.query(insertGejala, (err, resultInsert) => {
              if (err) {
                console.error("Error inserting data:", err);
                return res
                  .status(500)
                  .json({ message: "Internal Server Error" });
              }
            });
          });
        }
      }

      // mengisi jenis berdasarkan similarity
      let jenis;
      if (nilaiSimilarityTerbesar > 0.8) {
        jenis = "Kemungkinan penyakit sangat tinggi";
      } else if (
        nilaiSimilarityTerbesar > 0.6 &&
        nilaiSimilarityTerbesar <= 0.8
      ) {
        jenis = "Kemungkinan penyakit tinggi";
      } else if (
        nilaiSimilarityTerbesar > 0.4 &&
        nilaiSimilarityTerbesar <= 0.6
      ) {
        jenis = "Kemungkinan penyakit sedang";
      } else if (
        nilaiSimilarityTerbesar > 0.2 &&
        nilaiSimilarityTerbesar <= 0.4
      ) {
        jenis = "Kemungkinan penyakit rendah";
      } else {
        jenis = "Kemungkinan penyakit sangat rendah";
      }

      // menghasilkan nilai KNN
      const neighbors = Object.entries(hasilPerbandingan).map(
        ([idKasus, nilaiGejala]) => {
          const bobotKasus = bobots[idKasus];
          const similarity = calculateSimilarity(nilaiGejala, bobotKasus);
          return { id_kasus: idKasus, similarity: similarity };
        }
      );

      neighbors.sort((a, b) => b.similarity - a.similarity);

      const K = 3;
      const kNearest = neighbors.slice(0, K);

      const jumlahKasus = {};
      kNearest.forEach((neighbor) => {
        const idKasus = neighbor.id_kasus;
        jumlahKasus[idKasus] = (jumlahKasus[idKasus] || 0) + 1;
      });

      let mostFrequentCaseId = null;
      let maxOccurrences = 0;
      for (const [idKasus, occurrences] of Object.entries(jumlahKasus)) {
        if (occurrences > maxOccurrences) {
          mostFrequentCaseId = idKasus;
          maxOccurrences = occurrences;
        }
      }

      //
      const queryPenyakit = `SELECT hapen.* FROM hapen JOIN basiskasus ON hapen.id_hapen = basiskasus.id_hapen WHERE basiskasus.id_basiskasus = '${mostFrequentCaseId}'`;
      connection.query(queryPenyakit, (err, resultPenyakit) => {
        if (err) {
          console.error("Error fetching data:", err);
          return res.status(500).json({ message: "Internal Server Error" });
        }

        if (resultPenyakit.length > 0) {
          const rowPenyakit = resultPenyakit[0];
          const namaPenyakitTerbesar = rowPenyakit.nama_hapen;
          const solusi = rowPenyakit.solusi;
          const tgl_deteksi = new Date().toISOString().slice(0, 10);
          const insertDeteksi = `INSERT INTO deteksi (id_deteksi, id_basiskasus, gejala, hasil, similarity, jenis, solusi, tgl_deteksi) VALUES ('${id_deteksi}', '${idKasusTerbesar}', '${resultGabungan}', '${namaPenyakitTerbesar}', '${nilaiSimilarityTerbesar}', '${jenis}', '${solusi}', '${tgl_deteksi}')`;

          connection.query(insertDeteksi, (err, resultInsertDeteksi) => {
            if (err) {
              console.error("Error inserting data:", err);
              return res.status(500).json({ message: "Internal Server Error" });
            }

            //const topKNeighbors = neighbors.slice(0, K);

            const values = kNearest.map((neighbor) => [
              id_deteksi,
              neighbor.id_kasus,
              neighbor.similarity,
            ]);

            if (values.length > 0) {
              const insertKNN =
                "INSERT INTO knn (id_deteksi, id_basiskasus, similarity) VALUES ?";
              connection.query(insertKNN, [values], (err, resultInsertKNN) => {
                if (err) {
                  console.error("Error inserting data:", err);
                  return res
                    .status(500)
                    .json({ message: "Internal Server Error" });
                }
                res.json({
                  message:
                    "Data successfully processed and inserted into the database.",
                });
              });
            } else {
              res.json({
                message:
                  "Data successfully processed and inserted into the database.",
              });
            }
          });
        } else {
          res.status(404).json({ message: "Penyakit not found" });
        }
      });
    });
  });
});

//////////////////////////////////////////////////////////////////
///////////// Route untuk data dari tabel "knn" //////////////////
//////////////////////////////////////////////////////////////////

app.get("/api/neighbors/:idDeteksi", (req, res) => {
  const idDeteksi = req.params.idDeteksi;

  const queryNeighbors = `
    SELECT knn.*, basiskasus.id_basiskasus, hapen.nama_hapen
    FROM knn
    JOIN basiskasus ON knn.id_basiskasus = basiskasus.id_basiskasus
    JOIN hapen ON basiskasus.id_hapen = hapen.id_hapen
    WHERE knn.id_deteksi = ?
    ORDER BY knn.similarity DESC`;

  connection.query(queryNeighbors, [idDeteksi], (err, result) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    const neighbors = [];
    const visitedIds = [];

    result.forEach((rowNeighbor) => {
      const idKasus = rowNeighbor.id_basiskasus;
      const namaHapen = rowNeighbor.nama_hapen;
      const similarity = rowNeighbor.similarity;

      if (!visitedIds.includes(idKasus)) {
        neighbors.push({ idKasus, namaHapen, similarity });
        visitedIds.push(idKasus);
      }
    });

    res.json(neighbors);
  });
});

//////////////////////////////////////////////////////////////////
//////////////// Route untuk data dari report ////////////////////
//////////////////////////////////////////////////////////////////

app.get("/api/deteksi", (req, res) => {
  const query = "SELECT * FROM deteksi";

  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    res.json(results);
  });
});

// Server Listening
app.listen(port, () => {
  console.log(`Server berjalan pada http://localhost:${port}`);
});
