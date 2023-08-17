const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "hamacbr",
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

app.post("/api/deteksi", (req, res) => {
  const { id_deteksi, gejala } = req.body;
  let idHapen;
  let resultGabungan;

  if (!id_deteksi || !Array.isArray(gejala) || gejala.length === 0) {
    return res.status(400).json({ message: "Invalid data format" });
  }

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
      const totalBobot = bobotKasus.reduce((sum, bobot) => sum + bobot, 0); // menjumlahkan bobot-bobot dalam array
      const bobotPangkatDua = Math.pow(totalBobot, 2);
      const hasil = calculateSimilarity(nilaiGejala, bobotKasus);

      const hasilAkhirDinormalisasi = hasil / bobotPangkatDua;
      console.log(hasilAkhirDinormalisasi);
      console.log("===================");

      if (hasilAkhirDinormalisasi > nilaiSimilarityTerbesar) {
        nilaiSimilarityTerbesar = hasilAkhirDinormalisasi;
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
          const totalBobot = bobotKasus.reduce((sum, bobot) => sum + bobot, 0); // menjumlahkan bobot-bobot dalam array
          const bobotPangkatDua = Math.pow(totalBobot, 2);
          const hasilKnn = calculateSimilarity(nilaiGejala, bobotKasus);

          const similarity = hasilKnn / bobotPangkatDua;
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
          const insertDeteksi = `INSERT INTO deteksi (id_deteksi, id_hapen, id_basiskasus, gejala, hasil, similarity, jenis, solusi, tgl_deteksi) VALUES ('${id_deteksi}', '${idHapen}', '${idKasusTerbesar}', '${resultGabungan}', '${namaPenyakitTerbesar}', '${nilaiSimilarityTerbesar}', '${jenis}', '${solusi}', '${tgl_deteksi}')`;

          connection.query(insertDeteksi, (err, resultInsertDeteksi) => {
            if (err) {
              console.error("Error inserting data:", err);
              return res.status(500).json({ message: "Internal Server Error" });
            }

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

app.listen(port, () => {
  console.log(`Server berjalan pada http://localhost:${port}`);
});
