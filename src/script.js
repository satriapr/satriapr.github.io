const width = window.innerWidth * 0.9; // 90% of the window's width
const height = 700;
const margin = { top: 50, right: 30, bottom: 45, left: 60 };

const svg = d3.select('#narrative-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('margin', '0 auto')
    .style('display', 'block');

const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip');

const xScale = d3.scaleLinear().range([margin.left, width - margin.right]);
const yScale = d3.scaleLinear().range([height - margin.bottom, margin.top]);

const xAxis = svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`);
const yAxis = svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`);

svg.append('text')
    .attr('class', 'axis-label')
    .attr('x', width / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .text('Average IQ');

svg.append('text')
    .attr('class', 'axis-label')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .text('Percentage of Tertiary Education');

d3.csv('data/merged_data.csv').then(data => {
    data.forEach(d => {
        d.year = +d.year;
        d.tertiary_percentage = +d.tertiary_percentage;
        d.average_iq = +d.average_iq;
        d.count = +d.count;
    });

    const startYear = 1901;
    const endYear = 2020;
    const yearRangeSize = 10;

    const yearRanges = [];
    for (let i = startYear; i <= endYear; i += yearRangeSize) {
        yearRanges.push({ range: `${i}-${i + yearRangeSize - 1}`, start: i, end: i + yearRangeSize - 1 });
    }

    // Clear the year range container before appending new buttons
    const yearRangeContainer = d3.select('#year-range');
    yearRangeContainer.selectAll('span').remove();

    // Add event listeners for Next and Previous buttons
    const nextButton = d3.select('#next-button');
    const prevButton = d3.select('#prev-button');

    let currentRangeIndex = 0;

    function updateButtons() {
        nextButton.attr('disabled', currentRangeIndex >= yearRanges.length - 1 ? true : null);
        prevButton.attr('disabled', currentRangeIndex <= 0 ? true : null);
    }

    nextButton.on('click', () => {
        if (currentRangeIndex < yearRanges.length - 1) {
            currentRangeIndex++;
            const range = yearRanges[currentRangeIndex].range;
            highlightYearRanges(range);
            updateChart(range);
            updateButtons();
        }
    });

    prevButton.on('click', () => {
        if (currentRangeIndex > 0) {
            currentRangeIndex--;
            const range = yearRanges[currentRangeIndex].range;
            highlightYearRanges(range);
            updateChart(range);
            updateButtons();
        }
    });

    // Generate year range buttons
    yearRanges.forEach((range, index) => {
        yearRangeContainer.append('span')
            .attr('data-range', range.range)
            .text(range.range)
            .on('click', function() {
                currentRangeIndex = index;
                const range = d3.select(this).attr('data-range');
                highlightYearRanges(range);
                updateChart(range);
                updateButtons();
            });
    });

    const filteredData = data; // Use the unfiltered data

    xScale.domain([65, 105]);
    yScale.domain([0, 140]);

    xAxis.call(d3.axisBottom(xScale)
        .tickValues([65, 70, 75, 80, 85, 90, 95, 100, 105, 110])
        .tickFormat(d3.format('~s')));
    yAxis.call(d3.axisLeft(yScale)
        .tickValues([0, 20, 40, 60, 80, 100, 120, 140])
        .tickFormat(d3.format('~s')));

    const barChartMargin = { top: 20, right: 30, bottom: 50, left: 150 };
    const barChartWidth = width;

    const barChartSvg = d3.select('#narrative-container')
        .append('svg')
        .attr('width', barChartWidth)
        .style('margin', '0 auto')
        .style('display', 'block');

    const barXScale = d3.scaleLinear().range([barChartMargin.left, barChartWidth - barChartMargin.right]);
    const barYScale = d3.scaleBand().padding(0.1);

    const barXAxis = barChartSvg.append('g')
        .attr('transform', `translate(0, ${barChartMargin.bottom})`);
    const barYAxis = barChartSvg.append('g')
        .attr('transform', `translate(${barChartMargin.left}, 0)`);

    barChartSvg.append('text')
        .attr('class', 'axis-label')
        .attr('x', barChartWidth / 2)
        .attr('y', barChartMargin.bottom - 10)
        .attr('text-anchor', 'middle')
        .text('Cumulative Nobel Count');

    barChartSvg.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -barChartMargin.bottom)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .text('Country');

    function updateChart(range) {
        const { start, end } = yearRanges.find(d => d.range === range);

        // Aggregate the data by country
        const yearFilteredData = filteredData.filter(d => d.year >= start && d.year <= end);
        const aggregatedData = d3.rollup(yearFilteredData,
            v => ({
                country: v[0].country,
                average_iq: d3.max(v, d => d.average_iq),
                tertiary_percentage: d3.max(v, d => d.tertiary_percentage),
                count: d3.sum(v, d => d.count)
            }),
            d => d.country
        );

        console.log('aggregatedData', aggregatedData);

        const maxCount = d3.max(Array.from(aggregatedData.values()), d => d.count);

        const circles = svg.selectAll('circle').data(Array.from(aggregatedData.values()), d => d.country);

        circles.exit().transition().duration(500).attr('r', 0).remove();

        circles.enter().append('circle')
            .attr('cx', d => xScale(d.average_iq))
            .attr('cy', d => yScale(d.tertiary_percentage))
            .attr('r', 0) // Start with radius 0 for animation
            .merge(circles)
            .transition().duration(1000)
            .attr('cx', d => xScale(d.average_iq))
            .attr('cy', d => yScale(d.tertiary_percentage))
            .attr('r', d => Math.sqrt(d.count) * 5)
            .attr('fill', d => d.count === maxCount ? '#d62728' : '#ff7f0e') // Red for max count, orange for others
            .attr('stroke', 'black') // Black border
            .attr('opacity', 0.7)
            .selection() // End transition and return selection
            .on('mouseover', (event, d) => {
                tooltip.transition().duration(200).style('opacity', .9);
                tooltip.html(`
                    <div>
                        <strong>Country:</strong> ${d.country}<br>
                        <strong>Percentage of Tertiary Education:</strong> ${d3.format(",.2f")(d.tertiary_percentage)}%<br>
                        <strong>Average IQ:</strong> ${d.average_iq}<br>
                        <strong>Nobel Count:</strong> ${d.count}
                    </div>
                `)
                .style('left', (event.pageX + 5) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => {
                tooltip.transition().duration(500).style('opacity', 0);
            });

        // Add country names
        const scatterTexts = svg.selectAll('.country-label').data(Array.from(aggregatedData.values()), d => d.country);

        scatterTexts.exit().transition().duration(500).attr('opacity', 0).remove();

        scatterTexts.enter().append('text')
            .attr('class', 'country-label')
            .attr('x', d => xScale(d.average_iq))
            .attr('y', d => yScale(d.tertiary_percentage) - Math.sqrt(d.count) * 5 - 1) // Position above the circle
            .attr('opacity', 0) // Start with opacity 0 for animation
            .merge(scatterTexts)
            .transition().duration(1000) // Add transition
            .attr('x', d => xScale(d.average_iq))
            .attr('y', d => yScale(d.tertiary_percentage) - Math.sqrt(d.count) * 5 - 1)
            .attr('text-anchor', 'middle')
            .attr('font-size', '8px')
            .attr('fill', 'black')
            .attr('opacity', 1)
            .text(d => d.country);

        // Calculate cumulative Nobel count
        const cumulativeData = new Map();
        yearRanges.forEach(r => {
            if (r.end <= end) {
                const yearFilteredData = filteredData.filter(d => d.year >= r.start && d.year <= r.end);
                yearFilteredData.forEach(d => {
                    if (!cumulativeData.has(d.country)) {
                        cumulativeData.set(d.country, 0);
                    }
                    cumulativeData.set(d.country, cumulativeData.get(d.country) + d.count);
                });
            }
        });

        let cumulativeArray = Array.from(cumulativeData, ([country, count]) => {
            const countryData = filteredData.find(d => d.country === country);
            return {
              country,
                count,
                average_iq: countryData ? countryData.average_iq : 0,
                tertiary_percentage: countryData ? countryData.tertiary_percentage : 0
            };
        });

        // Sort cumulativeArray by count in descending order
        cumulativeArray.sort((a, b) => b.count - a.count);

        // Adjust bar chart height based on the number of countries
        const barHeight = 12; // Shorter bar height
        const barChartHeight = cumulativeArray.length * barHeight + barChartMargin.top + barChartMargin.bottom;

        barChartSvg.attr('height', barChartHeight);

        barXScale.domain([0, d3.max(cumulativeArray, d => d.count)]);
        barYScale.domain(cumulativeArray.map(d => d.country)).range([barChartMargin.top, barChartHeight - barChartMargin.bottom]);

        barXAxis.attr('transform', `translate(0, ${barChartHeight - barChartMargin.bottom})`)
            .call(d3.axisBottom(barXScale)
                .tickValues([0, 2, 5, 10, 20, 50])
                .tickFormat(d3.format('~s'))
                .ticks(5)); // Ensure all ticks are displayed

        barYAxis.call(d3.axisLeft(barYScale));

        const bars = barChartSvg.selectAll('.bar').data(cumulativeArray, d => d.country);

        bars.exit().transition().duration(500).attr('width', 0).remove();

        bars.enter().append('rect')
            .attr('class', 'bar')
            .attr('x', barXScale(0))
            .attr('y', d => barYScale(d.country))
            .attr('width', 0) // Start with width 0 for animation
            .attr('height', barYScale.bandwidth())
            .merge(bars)
            .transition().duration(1000)
            .attr('x', barXScale(0))
            .attr('y', d => barYScale(d.country))
            .attr('width', d => barXScale(d.count) - barXScale(0))
            .attr('height', barYScale.bandwidth())
            .attr('fill', d => d.count === d3.max(cumulativeArray, d => d.count) ? '#d62728' : '#ff7f0e') // Red for max count, orange for others
            .attr('opacity', 0.7)
            .selection() // End transition and return selection
            .on('mouseover', (event, d) => {
                tooltip.transition().duration(200).style('opacity', .9);
                tooltip.html(`
                    <div>
                        <strong>Country:</strong> ${d.country}<br>
                        <strong>Percentage of Tertiary Education:</strong> ${d3.format(",.2f")(d.tertiary_percentage)}%<br>
                        <strong>Average IQ:</strong> ${d.average_iq} million<br>
                        <strong>Cumulative Nobel Count:</strong> ${d.count}
                    </div>
                `)
                .style('left', (event.pageX + 5) + 'px')
                .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', () => {
                tooltip.transition().duration(500).style('opacity', 0);
            });

        // Handle text elements separately
        const texts = barChartSvg.selectAll('.bar-text').data(cumulativeArray, d => d.country);

        texts.exit().remove();

        texts.enter().append('text')
            .attr('class', 'bar-text')
            .merge(texts)
            .attr('x', d => barXScale(d.count) + 5)
            .attr('y', d => barYScale(d.country) + barYScale.bandwidth() / 2)
            .attr('dy', '.35em')
            .text(d => d.count)
            .attr('fill', 'black')
            .style('font-size', '10px'); // Smaller text size

        // Update axis labels position
        barChartSvg.select('.axis-label')
            .attr('x', barChartWidth / 2)
            .attr('y', barChartHeight - barChartMargin.bottom + 30); // Adjusted position

        barChartSvg.select('.axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('x', -barChartHeight / 2)
            .attr('y', barChartMargin.left - 40); // Adjusted position
    }

    function highlightYearRanges(selectedRange) {
        const [selectedStart, selectedEnd] = selectedRange.split('-').map(Number);
        d3.selectAll('#year-range span').each(function() {
            const [start, end] = d3.select(this).attr('data-range').split('-').map(Number);
            d3.select(this).classed('selected', start === selectedStart && end === selectedEnd);
            d3.select(this).classed('previous', end < selectedEnd);
        });
    }

    // Automatically select 1901-1910 on initial load
    d3.select(`#year-range span[data-range="1901-1910"]`).classed('selected', true);
    highlightYearRanges('1901-1910');
    updateChart('1901-1910');
    updateButtons();
});