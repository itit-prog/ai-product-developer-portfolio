import { readFile, writeFile } from 'node:fs/promises';
import { geoContains } from 'd3-geo';

const source = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json';
const world = process.argv[2]
  ? JSON.parse(await readFile(process.argv[2], 'utf8'))
  : await fetch(source).then(response => {
    if (!response.ok) throw new Error(`Map download failed: ${response.status}`);
    return response.json();
  });
const round = value => Math.round(value * 100000) / 100000;
const vector = (longitude, latitude) => {
  const phi = latitude * Math.PI / 180;
  const theta = longitude * Math.PI / 180;
  return [Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta)].map(round);
};
const dots = [];
const coast = [];
const samples = 18000;
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
// Equal-area samples keep the dots evenly spaced, including near the poles.
for (let index = 0; index < samples; index++) {
  const latitude = Math.asin(1 - 2 * (index + .5) / samples) * 180 / Math.PI;
  const longitude = ((index * goldenAngle * 180 / Math.PI) % 360) - 180;
  if (geoContains(world, [longitude, latitude])) dots.push(...vector(longitude, latitude));
}
for (const feature of world.features) {
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const polygon of polygons) for (const ring of polygon) {
    for (let index = 1; index < ring.length; index++) coast.push(...vector(...ring[index-1]), ...vector(...ring[index]));
  }
}
await writeFile(new URL('../public/earth-land.json', import.meta.url), JSON.stringify({ source, license: 'Natural Earth, public domain', dots, coast }));
console.log(`Prepared ${dots.length / 3} land dots and ${coast.length / 6} coastline segments.`);
