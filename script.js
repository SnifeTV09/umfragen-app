// Firebase Konfiguration – deine Werte hier einsetzen!
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc } 
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBuhT82bJRXZThbaokG8hhNaDEtHEXwnH4",
  authDomain: "werwurdeamehesten.firebaseapp.com",
  projectId: "werwurdeamehesten",
  storageBucket: "werwurdeamehesten.firebasestorage.app",
  messagingSenderId: "90818664368",
  appId: "1:90818664368:web:31ccc35432dbffa35fe875",
  measurementId: "G-KPFXK7NV0C"
};

// Firebase starten
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// User-ID erzeugen (einmalig pro Browser)
if (!localStorage.getItem("userId")) {
  localStorage.setItem("userId", crypto.randomUUID());
}
const userId = localStorage.getItem("userId");

const startBtn = document.getElementById("start-btn");
const startScreen = document.getElementById("start-screen");
const quizContainer = document.getElementById("quiz-container");

const questionEl = document.getElementById("question");
const answerButtons = Array.from(document.querySelectorAll(".answer-btn"));

let currentIndex = 0;

// Freunde
const friends = ["Fabienne","Tim","Tino","Jannik","Okan","Jessie","Lennart","Elias","Angpao"];

// Bilder
const friendImages = {
  "Fabienne": "images/fabienne.jpg",
  "Tim": "images/tim.jpg",
  "Tino": "images/tino.jpg",
  "Jannik": "images/jannik.jpg",
  "Okan": "images/okan.jpg",
  "Jessie": "images/jessie.jpg",
  "Lennart": "images/lennart.jpg",
  "Elias": "images/elias.jpg",
  "Angpao": "images/angpao.jpg"
};

// Fragen
const questions = [
  "Wer würde am ehesten zu spät kommen?",
  "Wer würde am ehesten eine Party organisieren?",
  "Wer würde am ehesten einen Horrorfilm-Marathon machen?",
  "Wer würde am ehesten einen Roadtrip planen?",
  "Wer würde am ehesten ein peinliches Foto posten?",
  "Wer würde am ehesten beim Videospiel gewinnen?",
  "Wer würde am ehesten die Gruppe motivieren?",
  "Wer würde am ehesten ein Geheimnis verraten?",
  "Wer würde am ehesten ein neues Hobby anfangen?",
  "Wer würde am ehesten spontan verreisen?"
];

// --- Admin Interface ---
const adminPassword = "4336373734"; // hier dein Passwort einsetzen

const adminDiv = document.createElement("div");
adminDiv.style.display = "none";
adminDiv.style.margin = "20px";
adminDiv.innerHTML = `
  <h3>Admin: Kontrolle</h3>
  <input id="unlock-id" placeholder="userId eingeben" style="width:300px;"/>
  <button id="unlock-btn">Einzelnen Nutzer freischalten</button>
  <button id="reset-all-btn">Alle Nutzer freischalten</button>
  <button id="delete-all-btn">Alle Stimmen löschen</button>
`;
document.body.appendChild(adminDiv);

// Tastenkombination: drücke "a" → Passwortabfrage
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "a") {
    const pw = prompt("Admin-Passwort eingeben:");
    if (pw === adminPassword) {
      adminDiv.style.display = "block";
    }
  }
});

// Einzelnen Nutzer freischalten
document.getElementById("unlock-btn")?.addEventListener("click", async () => {
  const targetId = document.getElementById("unlock-id").value.trim();
  if (!targetId) {
    alert("Bitte eine userId eingeben!");
    return;
  }
  const snapshot = await getDocs(query(collection(db, "votes"), where("userId", "==", targetId)));
  snapshot.forEach(async (d) => {
    await deleteDoc(doc(db, "votes", d.id));
  });
  alert(`Nutzer ${targetId} wurde freigeschaltet!`);
});

// Alle Nutzer freischalten (alle Stimmen löschen)
document.getElementById("reset-all-btn")?.addEventListener("click", async () => {
  const snapshot = await getDocs(collection(db, "votes"));
  snapshot.forEach(async (d) => {
    await deleteDoc(doc(db, "votes", d.id));
  });
  localStorage.removeItem("quizFinished");
  alert("Alle Nutzer wurden freigeschaltet!");
  location.reload();
});

// Alle Stimmen komplett löschen (Reset für die Runde)
document.getElementById("delete-all-btn")?.addEventListener("click", async () => {
  const snapshot = await getDocs(collection(db, "votes"));
  snapshot.forEach(async (d) => {
    await deleteDoc(doc(db, "votes", d.id));
  });
  localStorage.removeItem("quizFinished");
  alert("Alle Stimmen wurden gelöscht! Neues Spiel kann starten.");
  location.reload();
});

// --- Quiz Logik ---

// NEU: Prüfen ob Datenbank leer ist → Sperre aufheben
(async () => {
  const snapshot = await getDocs(collection(db, "votes"));
  if (snapshot.empty) {
    localStorage.removeItem("quizFinished");
  }
})();

// Prüfen ob Quiz schon beendet wurde
if (localStorage.getItem("quizFinished") === "true") {
  startScreen.innerHTML = `
    <h1>Du darfst nur einmal abstimmen!</h1>
    <p>Deine Stimmen wurden gezählt. Schau dir die Ergebnisse an.</p>
    <button id="results-btn">Zu den Ergebnissen</button>
  `;
  document.getElementById("results-btn").addEventListener("click", async () => {
    startScreen.style.display = "none";
    quizContainer.hidden = false;
    await showResults();
  });
}

// Start
startBtn?.addEventListener("click", () => {
  startScreen.style.display = "none";
  quizContainer.hidden = false;
  currentIndex = 0;
  loadQuestion();
});

function loadQuestion() {
  if (currentIndex >= questions.length) {
    showResults();
    return;
  }

  questionEl.textContent = questions[currentIndex];

  answerButtons.forEach((btn, i) => {
    btn.innerHTML = "";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = friends[i];

    const img = document.createElement("img");
    img.src = friendImages[friends[i]];

    btn.appendChild(nameSpan);
    btn.appendChild(img);

    btn.disabled = false;
    btn.classList.remove("voted");
  });
}

// Abstimmung
answerButtons.forEach((btn, i) => {
  btn.addEventListener("click", async () => {
    const question = questions[currentIndex];
    const friend = friends[i];

    // Prüfen ob dieser Nutzer schon für diese Frage abgestimmt hat
    const qSnap = await getDocs(query(
      collection(db, "votes"),
      where("question", "==", question),
      where("userId", "==", userId)
    ));

    if (!qSnap.empty) {
      alert("Du hast für diese Frage schon abgestimmt!");
      return;
    }

    // Stimme speichern
    await addDoc(collection(db, "votes"), {
      question: question,
      votedFor: friend,
      userId: userId,
      timestamp: Date.now()
    });

    btn.classList.add("voted");
    answerButtons.forEach(b => b.disabled = true);

    setTimeout(() => {
      currentIndex++;
      loadQuestion();
    }, 500);

    // Wenn letzte Frage beantwortet → Quiz als beendet markieren
    if (currentIndex + 1 >= questions.length) {
      localStorage.setItem("quizFinished", "true");
    }
  });
});

// Ergebnisse anzeigen
async function showResults() {
  const snapshotAll = await getDocs(collection(db, "votes"));
  if (snapshotAll.empty) {
    quizContainer.innerHTML = "<h2>Noch keine Stimmen abgegeben!</h2>";
    return;
  }

  quizContainer.innerHTML = `<h2>Ergebnisse der Abstimmung</h2>`;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const qDiv = document.createElement("div");
    qDiv.classList.add("result-question");

    const qTitle = document.createElement("p");
    qTitle.textContent = q;
    qTitle.classList.add("result-title");
    qDiv.appendChild(qTitle);

    const qSnap = await getDocs(query(collection(db, "votes"), where("question", "==", q)));
    const votes = {};
    friends.forEach(f => votes[f] = 0);
    qSnap.forEach(doc => {
      votes[doc.data().votedFor]++;
    });

       const maxVotes = Math.max(...friends.map(f => votes[f]));
    const totalVotes = friends.reduce((sum, f) => sum + votes[f], 0);

    friends.forEach(f => {
      const barContainer = document.createElement("div");
      barContainer.classList.add("bar-container");

      const img = document.createElement("img");
      img.src = friendImages[f];

      const nameSpan = document.createElement("span");
      nameSpan.textContent = f;
      nameSpan.classList.add("bar-name");

      const bar = document.createElement("div");
      bar.classList.add("bar");

      const widthPercent = maxVotes > 0 ? (votes[f] / maxVotes) * 100 : 0;
      bar.style.width = `${widthPercent}%`;

      const share = totalVotes > 0 ? Math.round((votes[f] / totalVotes) * 100) : 0;
      bar.textContent = totalVotes > 0 ? `${votes[f]} (${share}%)` : `${votes[f]}`;

      barContainer.appendChild(img);
      barContainer.appendChild(nameSpan);
      barContainer.appendChild(bar);

      qDiv.appendChild(barContainer);
    });

    quizContainer.appendChild(qDiv);
  }
}

