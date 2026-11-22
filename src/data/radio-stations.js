export const RADIO_STATIONS = [
  {
    id: 'loner-village',
    name: 'Радио Деревни новичков',
    locations: ['rookie-village'],
    description: 'Негромкий эфир для тех, кто держится ближе к деревне.'
  },
  {
    id: 'loner-forest',
    name: 'Радио лесного лагеря',
    locations: ['forest-camp'],
    description: 'Музыка и передачи для путников у лесного костра.'
  },
  {
    id: 'bandit-atp',
    name: 'Радио АТП',
    locations: ['atp'],
    description: 'Эфир с территории автотранспортного предприятия.'
  },
  {
    id: 'military-network',
    name: 'Военная радиосеть',
    locations: ['north-checkpoint', 'bridge-checkpoint', 'south-checkpoint'],
    description: 'Общий эфир военных блокпостов Кордона.'
  }
];

export function getRadioStationForLocation(locationId) {
  return RADIO_STATIONS.find(station => station.locations.includes(locationId)) || null;
}
