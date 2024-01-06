<template>
  <div class="container">
    <h1>OD Caen</h1>
    <form @submit.prevent="submitSurvey">
      <div v-if="!showSecondSet">

        <div class="form-group">
          <label for="poste">Poste</label>
          <select id="poste" v-model="reponse.poste" class="form-control">
            <option v-for="option in postes" :key="option.id" :value="option.output">{{ option.text }}</option>
          </select>
        </div>

        <div class="form-group">
          <label for="plaque">Code Pays (immatriculation du véhicule plaque à l'avant):</label>
          <select id="plaque" v-model="reponse.plaque" class="form-control">
            <option v-for="option in plaques" :key="option.id" :value="option.output">{{ option.text }}</option>
          </select>
        </div>

        <div class="form-group">
          <label for="type">Type de véhicule:</label>
          <select id="type" v-model="reponse.type" class="form-control">
            <option v-for="option in typeVehicule" :key="option.id" :value="option.output">{{ option.text }}</option>
          </select>
        </div>

    
    </div>


      <div v-else>
        <div v-if="reponse.type <= 4">
               <div class="form-group">
          <label for="commune-search">Origine:</label>
          <input id="commune-search" v-model="searchQuery" @input="onSearchInput" class="form-control"
            placeholder="Start typing...">
          <select v-if="filteredCommunes.length > 0" id="commune" v-model="reponse.origine" class="form-control">
            <option v-for="commune in filteredCommunes" :key="commune" :value="commune">
              {{ commune }}
            </option>
          </select>
        </div>
            <div class="form-group">
          <label for="type">Nombre d'occupants:</label>
          <select id="type" v-model="reponse.occupation" class="form-control">
            <option v-for="option in occupation" :key="option.id" :value="option.output">{{ option.text }}</option>
          </select>
        </div>
        </div>
        <div v-else-if="reponse.occupation > 4">
          PL
        </div>
      </div>
      <button v-show="showReturnButton" type="button" @click="returnButton" class="btn-return">Return to First
        Set</button>
      <input v-show="showSubmitButton" type="submit" value="Submit" class="btn-submit" :disabled="isSubmitDisabled">

    </form>
  </div>
  <button @click="downloadData" class="btn-data">Download Data</button>
</template>


<script setup>
import { ref, computed, watch } from 'vue'
import _ from 'lodash';
import { postes, plaques, typeVehicule, occupation } from './reponses'
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';
const communes = ref([]);
const searchQuery = ref('');
const filteredCommunes = ref([]);

const debouncedSearch = _.debounce(query => {
  if (query.length >= 3) {
    filteredCommunes.value = communes.value.filter(commune =>
      commune.toLowerCase().includes(query.toLowerCase())
    );
  } else {
    filteredCommunes.value = [];
  }
}, 300);


const onSearchInput = () => {
  debouncedSearch(searchQuery.value);
};



async function loadCommunes() {
  try {
    const response = await fetch('./ANAOD.xls');
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Define 'json' here so it's accessible throughout the function
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Filter out empty rows and create a Set from the commune names to remove duplicates
    const uniqueCommunes = new Set(
      json.map(row => row[0]).filter(value => value != null)
    );

    communes.value = Array.from(uniqueCommunes);
  } catch (error) {
    console.error('Error loading .xls file:', error);
  }
}


const surveyCollectionRef = collection(db, "Caen");
const num = ref(1);
const reponse = ref({
  poste: '',
  plaque: '',
  type: '',
  num: num.value,
  occupation: '',
  origine: ''
});

const showSecondSet = ref(false)
const showSubmitButton = ref(false)
const showReturnButton = ref(false)

watch(
  () => [reponse.value.poste, reponse.value.plaque, reponse.value.type, reponse.value.occupation],
  ([poste, plaque, type]) => {
    if (poste !== '' && plaque !== '' && type !== '') {
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

const returnButton = () => {
  reponse.value.occupation = '';
}

const isSubmitDisabled = computed(() => {
  return reponse.value.poste === '' || reponse.value.plaque === '' || reponse.value.type === '';
});

const submitSurvey = async () => {
  await addDoc(surveyCollectionRef, {
    q1: reponse.value.poste,
    q2: new Date().toLocaleDateString('fr-FR').replace(/\//g, '-'),
    q4: reponse.value.num,
    q5: new Date().toLocaleTimeString('fr-FR').slice(0, 8),
    q6: reponse.value.plaque,
    q7: reponse.value.type,
    q8: reponse.value.occupation,
    q9: reponse.value.origine
  });
  reponse.value.num++;
  reponse.value.poste = '';
  reponse.value.plaque = '';
  reponse.value.type = '';
  reponse.value.occupation = '';
  reponse.value.origine = ''
};

const downloadData = async () => {
  try {
    const querySnapshot = await getDocs(surveyCollectionRef);
    let data = [];
    let maxWidths = {};  // Object to keep track of maximum width for each column
    const minWidth = 21;  // Minimum width in Excel units, approximately 3 cm

    querySnapshot.forEach((doc) => {
      let docData = doc.data();
      let mappedData = {
        Poste: docData.q1 || '',
        Date: docData.q2 || '',
        Numero_Enquete: doc.id,  // Firebase document ID
        Numero_questionnaire: docData.q4 || '',
        heure: docData.q5 || '',
        q6: docData.q6 || '',
        q7: docData.q7 || '',
        q8: docData.q8 || '',
        q9: docData.q9 || '',

      };
      data.push(mappedData);
    });

    // Sort data by 'Numero_Enquete' (Firebase document ID)
    data.sort((a, b) => Number(a.Numero_questionnaire) - Number(b.Numero_questionnaire));

    // Calculate the maximum width for each column, considering the minimum width
    Object.keys(data[0]).forEach(key => {
      let maxLen = Math.max(...data.map(item => item[key].toString().length), minWidth);
      maxWidths[key] = maxLen;
    });

    // Convert data to a worksheet
    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: ["Poste", "Date", "Numero_Enquete", "Numero_questionnaire", "heure", "q6", "q7", "q8","q9"],
      skipHeader: false
    });

    // Set the widths for each column, ensuring a minimum width
    worksheet["!cols"] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[key] }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

    // Export the workbook to a .xlsx file
    XLSX.writeFile(workbook, "OdCaen.xlsx");
  } catch (error) {
    console.error("Error downloading data: ", error);
  }
};
 loadCommunes()
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
}

.btn-submit {
  background-color: #4CAF50;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  width: 100%;
}

.btn-submit:hover {
  background-color: #45a049;
}

.btn-data {
  position: absolute;
  bottom: 0;
  left: 0;
  background-color: #4CAF50;
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
  color: #4CAF50;
}
</style>