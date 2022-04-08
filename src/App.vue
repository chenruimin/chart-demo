<template>
  <v-app>
    <v-navigation-drawer app v-model="drawer">
      <v-container>
        <v-textarea
          v-model="data"
          name="data"
          label="Data"
          :rows="5"
        />
        <v-textarea
          v-model="options"
          name="options"
          label="Options"
          :rows="10"
        />
        <v-btn @click="submit">Submit</v-btn>
      </v-container>
    </v-navigation-drawer>

    <v-main>
      <div ref="chart" class="line-chart"></div>
    </v-main>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import axios from 'axios';
import * as d3 from 'd3';
import { Options, draw } from '@/utils/line-chart';

const DefaultOptions: Options = {
  dataMapping: {
    x: 'DateNew',
    y: 'Net_amount',
    z: 'DBName',
  },
  legend: {
    enabled: true,
    textSize: 15,
    position: 'topCenter',
    padding: 30,
    title: true,
    legendName: 'DBName',
  },
  xAxis: {
    ticksDensity: 50,
  },
  yAxis: {
    ticksDensity: 60,
  },
};

@Component({
  name: 'App',
})
export default class App extends Vue {
  $refs!: {
    chart: Element;
  };

  drawer = true;

  data: string | null = null;

  options = JSON.stringify(DefaultOptions);

  submit() {
    if (this.data) {
      draw(this.$refs.chart, JSON.parse(this.options), this.data);
    }
  }

  async mounted() {
    const data = await axios.get('./data/LineChartData.csv');
    this.data = data.data;

    if (this.data) {
      draw(this.$refs.chart, JSON.parse(this.options), this.data);
    }
  }
}
</script>

<style lang="sass" scoped>
.line-chart
  width: 100%
  height: 100%
</style>
