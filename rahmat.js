const data = [
  { bobot: 0.2, gejala: 1 },
  { bobot: 0.2, gejala: 0 },
  { bobot: 0.3, gejala: 2 },
];

// Hitung total bobot dari seluruh gejala
const totalBobot = data.reduce((sum, { bobot }) => sum + bobot, 0);

// Batas total bobot yang diinginkan (misalnya 1)
const batasTotalBobot = 1;

// Tentukan apakah semua gejala terpenuhi
const semuaGejalaTerpenuhi = data.every(({ gejala }) => gejala === 1);

// Hitung hasil berdasarkan total bobot dan gejala terpenuhi
let hasil;
if (totalBobot >= batasTotalBobot && semuaGejalaTerpenuhi) {
  hasil = 1;
} else {
  hasil = 1 - (batasTotalBobot - totalBobot);
}

console.log("Hasil:", hasil);
