/**
 * Indian States Vector Boundary Geometry for Interactive Choropleth Map
 * Scaled and projected for viewBox "0 0 650 720"
 */

export interface StateGeoData {
  id: string;
  name: string;
  path: string;
  center: [number, number]; // [x, y] for label/pointer
}

export const INDIA_STATES: StateGeoData[] = [
  {
    id: 'JK',
    name: 'Jammu and Kashmir',
    center: [215, 80],
    path: 'M 190,30 L 235,35 L 260,65 L 245,100 L 220,115 L 180,105 L 170,75 Z',
  },
  {
    id: 'HP',
    name: 'Himachal Pradesh',
    center: [230, 135],
    path: 'M 220,115 L 245,100 L 265,120 L 255,145 L 230,150 L 210,135 Z',
  },
  {
    id: 'PB',
    name: 'Punjab',
    center: [195, 155],
    path: 'M 180,120 L 210,135 L 215,165 L 185,175 L 170,145 Z',
  },
  {
    id: 'UT',
    name: 'Uttarakhand',
    center: [265, 160],
    path: 'M 245,140 L 270,135 L 295,160 L 285,185 L 250,175 Z',
  },
  {
    id: 'HR',
    name: 'Haryana',
    center: [215, 185],
    path: 'M 205,165 L 230,160 L 240,195 L 210,210 L 195,185 Z',
  },
  {
    id: 'DL',
    name: 'Delhi',
    center: [235, 192],
    path: 'M 230,188 L 240,188 L 242,198 L 232,198 Z',
  },
  {
    id: 'RJ',
    name: 'Rajasthan',
    center: [150, 240],
    path: 'M 170,175 L 210,210 L 220,255 L 190,305 L 130,295 L 95,250 L 120,200 Z',
  },
  {
    id: 'UP',
    name: 'Uttar Pradesh',
    center: [300, 240],
    path: 'M 240,195 L 285,185 L 340,210 L 375,260 L 330,295 L 270,270 L 245,230 Z',
  },
  {
    id: 'BR',
    name: 'Bihar',
    center: [405, 270],
    path: 'M 375,260 L 440,255 L 450,290 L 390,305 L 375,280 Z',
  },
  {
    id: 'JH',
    name: 'Jharkhand',
    center: [410, 330],
    path: 'M 390,305 L 445,300 L 445,345 L 385,355 Z',
  },
  {
    id: 'WB',
    name: 'West Bengal',
    center: [465, 335],
    path: 'M 445,245 L 460,250 L 455,300 L 475,340 L 470,390 L 445,385 L 445,300 Z',
  },
  {
    id: 'MP',
    name: 'Madhya Pradesh',
    center: [260, 320],
    path: 'M 220,255 L 270,270 L 330,295 L 340,350 L 270,375 L 200,345 L 205,290 Z',
  },
  {
    id: 'GJ',
    name: 'Gujarat',
    center: [115, 335],
    path: 'M 95,285 L 140,295 L 175,335 L 160,375 L 105,370 L 75,335 Z',
  },
  {
    id: 'MH',
    name: 'Maharashtra',
    center: [225, 420],
    path: 'M 160,375 L 270,375 L 310,410 L 280,470 L 210,480 L 170,440 Z',
  },
  {
    id: 'CG',
    name: 'Chhattisgarh',
    center: [340, 365],
    path: 'M 330,310 L 365,330 L 350,410 L 315,415 L 325,360 Z',
  },
  {
    id: 'OD',
    name: 'Odisha',
    center: [400, 395],
    path: 'M 365,340 L 435,345 L 445,405 L 395,440 L 355,405 Z',
  },
  {
    id: 'TG',
    name: 'Telangana',
    center: [285, 475],
    path: 'M 265,435 L 315,420 L 330,475 L 285,510 L 260,480 Z',
  },
  {
    id: 'AP',
    name: 'Andhra Pradesh',
    center: [320, 525],
    path: 'M 315,445 L 360,430 L 345,520 L 305,580 L 280,545 L 325,505 Z',
  },
  {
    id: 'KA',
    name: 'Karnataka',
    center: [215, 530],
    path: 'M 205,470 L 260,475 L 275,540 L 245,605 L 195,585 L 190,520 Z',
  },
  {
    id: 'GA',
    name: 'Goa',
    center: [180, 510],
    path: 'M 180,505 L 192,510 L 188,525 L 176,520 Z',
  },
  {
    id: 'TN',
    name: 'Tamil Nadu',
    center: [265, 625],
    path: 'M 245,575 L 295,570 L 300,645 L 255,685 L 235,650 Z',
  },
  {
    id: 'KL',
    name: 'Kerala',
    center: [215, 630],
    path: 'M 205,585 L 230,595 L 240,665 L 225,680 L 205,635 Z',
  },
  {
    id: 'AS',
    name: 'Assam',
    center: [550, 255],
    path: 'M 500,245 L 565,230 L 590,260 L 550,285 L 515,275 Z',
  },
];
