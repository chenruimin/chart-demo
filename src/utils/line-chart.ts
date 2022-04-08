import * as d3 from 'd3';

export type Options = {
  dataMapping: {
    x: string;
    y: string;
    z: string;
  };
  legend: {
    enabled: boolean;
    textSize: number;
    position: 'bottomCenter' | 'topCenter';
    padding: number;
    title: boolean;
    legendName: string;
  };
  xAxis: {
    ticksDensity: number;
  };
  yAxis: {
    ticksDensity: number;
  };
}

type Row = { [key: string]: number | string };

type PureRow = {
  x: number;
  y: number;
}

type CategoryData = {
  name: string;
  rows: PureRow[];
}

type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;
type SVGG = d3.Selection<SVGElementTagNameMap['g'], unknown, null, undefined>;

const margins = {
  top: 50,
  right: 50,
  bottom: 50,
  left: 50,
};

const legendHeight = 20;
const xAxisHeight = 20;
const yAxisWidth = 100;

function createSvg(element: Element): {
  svg: Selection<SVGSVGElement>;
  rect: {
    width: number;
    height: number;
  };
} {
  const rect = element.getBoundingClientRect();

  const svg = d3.select(element)
    .append('svg')
    .attr('width', rect.width)
    .attr('height', rect.height);

  return {
    svg,
    rect: {
      width: rect.width,
      height: rect.height,
    },
  };
}

function convert(data: Row[], options: Options): CategoryData[] {
  const categoryIndex: { [key: string]: number } = {};
  const categoryData: CategoryData[] = [];
  data.forEach((row) => {
    if (categoryIndex[row[options.dataMapping.z]] === undefined) {
      categoryData.push({
        name: row[options.dataMapping.z] as string,
        rows: [],
      });
      categoryIndex[row[options.dataMapping.z]] = categoryData.length - 1;
    }

    const item = categoryData[categoryIndex[row[options.dataMapping.z]]];
    item.rows.push({
      x: Date.parse(row[options.dataMapping.x] as string),
      y: parseFloat((row[options.dataMapping.y] as string).substr(1)),
    });
  });

  return categoryData;
}

let currentSvg: Selection<SVGSVGElement> | null = null;

export function draw(element: Element, options: Options, csvData: string) {
  if (currentSvg) {
    currentSvg.remove();
  }
  const { svg, rect } = createSvg(element);
  currentSvg = svg;
  const data: Row[] = (d3.csvParse(csvData) as Row[])
    .sort((r1, r2) => (r1[options.dataMapping.x] < r2[options.dataMapping.x] ? -1 : 1));

  const X = d3.map(data, (row) => Date.parse(row[options.dataMapping.x] as string));
  const Y = d3.map(data, (row) => parseFloat((row[options.dataMapping.y] as string).substr(1)));
  const I = d3.range(X.length);

  const xDomain = d3.extent(X) as [number, number];
  const yDomain = [0, d3.max(Y) as number];

  const chartWidth = rect.width - margins.right - margins.left;
  let chartHeight = rect.height - margins.bottom - margins.top;
  if (options.legend.enabled) {
    chartHeight -= options.legend.padding + legendHeight;
  }

  const xRange = [0, chartWidth - yAxisWidth];
  const yRange = [chartHeight - xAxisHeight, 0];

  const xScale = d3.scaleUtc(xDomain, xRange);
  const yScale = d3.scaleLinear(yDomain, yRange);

  const timeFormat = d3.timeFormat('%b %d, %y');
  const xAxis = (g: SVGG) => g
    .attr('transform', `translate(0,${chartHeight - xAxisHeight})`)
    .call(
      d3.axisBottom(xScale)
        .ticks(chartWidth * (options.xAxis.ticksDensity / 8000))
        .tickFormat((d) => timeFormat(new Date(d as number)))
        .tickSizeOuter(0),
    );

  const yAxis = (g: SVGG) => g
    .call(d3.axisLeft(yScale).ticks(chartHeight * (options.yAxis.ticksDensity / 1000)))
    .call((g2: SVGG) => g2.select('.domain').remove());

  const categoryData = convert(data, options);

  const line = d3
    .line()
    .defined(([, y]) => !Number.isNaN(y))
    .x(([x]) => xScale(x))
    .y(([, y]) => yScale(y))
    .curve(d3.curveLinear);

  const colors = ['red', 'blue', 'green', 'black', 'orange', 'pink', 'purple'];

  const chart = svg.append('g');
  if (options.legend.enabled && options.legend.position === 'topCenter') {
    chart.attr('transform', `translate(${margins.left + yAxisWidth},${margins.top + options.legend.padding + legendHeight})`);
  } else {
    chart.attr('transform', `translate(${margins.left + yAxisWidth},${margins.top})`);
  }

  chart
    .selectAll('path')
    .data(categoryData)
    .join('path')
    .datum((d) => d.rows.map(({ x, y }) => [x, y]))
    .attr('fill', 'none')
    .attr('stroke-width', 1.5)
    .attr('stroke-linejoin', 'round')
    .attr('stroke-linecap', 'round')
    .attr('stroke', (d, i) => colors[i])
    // @ts-ignore
    .attr('d', line);

  chart.append('g').call(xAxis);

  chart.append('g').call(yAxis);

  if (options.legend.enabled) {
    const legendItemWidth = 100;
    const legendTitleWidth = options.legend.title ? 100 : 0;
    const legendWidth = legendItemWidth * categoryData.length + legendTitleWidth;
    const legend = svg.append('g')
      .attr('text-anchor', 'start')
      .attr('font-family', 'sans-serif')
      .attr('font-size', options.legend.textSize);

    if (options.legend.position === 'bottomCenter') {
      legend.attr('transform', `translate(${margins.left + chartWidth / 2 - legendWidth / 2},${chartHeight + margins.top + options.legend.padding})`);
    } else {
      legend.attr('transform', `translate(${margins.left + chartWidth / 2 - legendWidth / 2},${margins.top})`);
    }

    if (options.legend.title) {
      legend.append('text')
        .attr('x', 0)
        .attr('y', 10)
        .attr('font-weight', 'bold')
        .attr('dy', '0.35em')
        .text(options.legend.legendName);
    }

    const g = legend
      .append('g')
      .attr('transform', `translate(${legendTitleWidth},0)`)
      .selectAll('g')
      .data(categoryData)
      .join('g')
      .attr('transform', (d, i) => `translate(${i * legendItemWidth}, 0)`);

    g.append('rect')
      .attr('x', 0)
      .attr('width', 20)
      .attr('height', 20)
      .attr('fill', (d, i) => colors[i]);

    g.append('text')
      .attr('x', 30)
      .attr('y', 10)
      .attr('dy', '0.35em')
      .text((d) => d.name);
  }
}
