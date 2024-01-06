<template>
  <div class="container">
    <h1>OD Caen</h1>
    <form @submit.prevent="submitSurvey">
      <div v-if="!showSecondSet">
        <div class="form-group">
          <label for="poste">Poste</label>
          <select id="poste" v-model="reponse.poste" class="form-control">
            <option v-for="option in postes" :key="option.id" :value="option.output">
              {{ option.text }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="plaque">Code Pays (immatriculation du véhicule plaque à l'avant):</label>
          <select id="plaque" v-model="reponse.plaque" class="form-control">
            <option v-for="option in plaques" :key="option.id" :value="option.output">
              {{ option.text }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="type">Type de véhicule:</label>
          <select id="type" v-model="reponse.type" class="form-control">
            <option v-for="option in typeVehicule" :key="option.id" :value="option.output">
              {{ option.text }}
            </option>
          </select>
        </div>
      </div>

      <div v-else>
        <div v-if="reponse.type <= 4">

          <div class="form-group">
            <input class="form-control" type="text" v-model="reponse.origine"
              placeholder="Entrer les premiere lettres de la COMMUNE" />
            <ul v-if="showDropdown && reponse.origine && filteredCommunes.length" class="commune-dropdown">
              <li v-for="(item, index) in filteredCommunes" :key="`${item['CODE INSEE']}-${index}`"
                @click="selectCommune(item.COMMUNE, item.DEPARTEMENT)">
                {{ item.COMMUNE }} - {{ item.DEPARTEMENT }}
              </li>
            </ul>
          </div>

          <div class="form-group">
            <label for="type">Nombre d'occupants:</label>
            <select id="type" v-model="reponse.occupation" class="form-control">
              <option v-for="option in occupation" :key="option.id" :value="option.output">
                {{ option.text }}
              </option>
            </select>
          </div>
        </div>
        <div v-else-if="reponse.occupation > 4">PL</div>
      </div>
      <button v-show="showReturnButton" type="button" @click="returnButton" class="btn-return">
        Return to First Set
      </button>
      <input v-show="showSubmitButton" type="submit" value="Submit" class="btn-submit" :disabled="isSubmitDisabled" />
    </form>
  </div>
  <button @click="downloadData" class="btn-data">Download Data</button>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { postes, plaques, typeVehicule, occupation } from "./reponses";
import insee from "./output.json";
import { db } from "../firebaseConfig";
import * as XLSX from "xlsx";
import { collection, addDoc, getDocs } from "firebase/firestore";

const data = ref(insee);

const surveyCollectionRef = collection(db, "Caen");
const num = ref(1);
const reponse = ref({
  poste: "",
  plaque: "",
  type: "",
  num: num.value,
  occupation: "",
  origine: "",
});

const showSecondSet = ref(false);
const showSubmitButton = ref(false);
const showReturnButton = ref(false);

const showDropdown = ref(true);

const selectCommune = (commune1, commune2) => {
  reponse.value.origine = commune1 + ' - ' + commune2;
  showDropdown.value = false; // Hide the dropdown
};

// To show the dropdown again when the user types
watch(() => reponse.value.origine, (newValue) => {
  showDropdown.value = Boolean(newValue);
});

watch(
  () => [
    reponse.value.poste,
    reponse.value.plaque,
    reponse.value.type,
    reponse.value.occupation,
  ],
  ([poste, plaque, type]) => {
    if (poste !== "" && plaque !== "" && type !== "") {
      showSecondSet.value = true;
      showSubmitButton.value = true;
      showReturnButton.value = true;
    } else {
      showSecondSet.value = false;
      showSubmitButton.value = false;
      showReturnButton.value = false;
    }
  }
);


const filteredCommunes = computed(() => {
  return data.value.filter(item =>
    item.COMMUNE.toLowerCase().includes(reponse.value.origine.toLowerCase())
  );
});




const returnButton = () => {
  reponse.value.type = "";
};

const isSubmitDisabled = computed(() => {
  return (
    reponse.value.poste === "" ||
    reponse.value.plaque === "" ||
    reponse.value.type === ""
  );
});

const submitSurvey = async () => {
  await addDoc(surveyCollectionRef, {
    q1: reponse.value.poste,
    q2: new Date().toLocaleDateString("fr-FR").replace(/\//g, "-"),
    q4: reponse.value.num,
    q5: new Date().toLocaleTimeString("fr-FR").slice(0, 8),
    q6: reponse.value.plaque,
    q7: reponse.value.type,
    q8: reponse.value.occupation,
    q9: reponse.value.origine,
  });
  reponse.value.num++;
  reponse.value.poste = "";
  reponse.value.plaque = "";
  reponse.value.type = "";
  reponse.value.occupation = "";
  reponse.value.origine = "";
};

const downloadData = async () => {
  try {
    const querySnapshot = await getDocs(surveyCollectionRef);
    let data = [];
    let maxWidths = {}; // Object to keep track of maximum width for each column
    const minWidth = 1; // Minimum width in Excel units, approximately 3 cm

    querySnapshot.forEach((doc) => {
      let docData = doc.data();
      let mappedData = {
        q1: docData.q1 || "",
        q2: docData.q2 || "",
        q3: doc.id, // Firebase document ID
        q4: docData.q4 || "",
        q5: docData.q5 || "",
        q6: docData.q6 || "",
        q7: docData.q7 || "",
        q8: docData.q8 || "",
        q9: docData.q9 || "",
      };
      data.push(mappedData);
    });

      data.sort((a, b) => {
      // Assuming q4 is a number. If it's a string or a different type, you might need to modify this comparison
      return a.q4 - b.q4;
    });

    // Calculate the maximum width for each column, considering the minimum width
    const scalingFactor = 1.1; // Adjust this factor as needed for padding or wider characters

    Object.keys(data[0]).forEach((key) => {
      let maxLen = Math.max(
        ...data.map((item) => item[key].toString().length),
        minWidth
      );

      maxWidths[key] = Math.ceil(maxLen * scalingFactor); // Apply scaling factor and round up
    });


    // Convert data to a worksheet
    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: [
        "q1",
        "q2",
        "q3",
        "q4",
        "q5",
        "q6",
        "q7",
        "q8",
        "q9",
      ],
      skipHeader: false,
    });

    // Set the widths for each column, ensuring a minimum width
    worksheet["!cols"] = Object.keys(maxWidths).map((key) => ({
      wch: maxWidths[key],
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    // Export the workbook to a .xlsx file
    XLSX.writeFile(workbook, "OdCaen.xlsx");
  } catch (error) {
    console.error("Error downloading data: ", error);
  }
};
</script>

<style>
body {
  background-color: #1e1e1e;
}

.container {
  background-color: #1e1e1e;
  color: white;
  padding: 20px;
  border-radius: 10px;
  width: 300px;
  margin: auto;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
}

.form-control {
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #333;
  background-color: #333;
  color: white;
  text-transform: uppercase;
}

.btn-submit {
  background-color: #4caf50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  width: 100%;
}

.btn-return {
  background-color: #4caf50;
  color: white;
  padding: 10px 20px;
  margin: 10px 0;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  width: 100%;
}

.btn-submit:hover {
  background-color: #45a049;
}

.btn-return:hover {
  background-color: #45a049;
}

.btn-data {
  position: absolute;
  bottom: 0;
  left: 0;
  background-color: #4caf50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  width: 100%;
}

.btn-data:hover {
  background-color: #45a049;
}

h1 {
  text-align: center;
  color: #4caf50;
}

.commune-dropdown {
  /* Style your dropdown list here */
  list-style-type: none;
  padding: 0;
  margin: 0;
  border: 1px solid #ccc;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.commune-dropdown li {
  padding: 5px 10px;
  cursor: pointer;
}

.commune-dropdown li:hover {
  background-color: #f0f0f0;
}
</style>
