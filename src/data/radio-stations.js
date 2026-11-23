export const RADIO_STATIONS = [
  {
    id: 'loner-village',
    name: 'Радио Деревни новичков',
    locations: ['rookie-village'],
    description: 'Негромкий эфир деревни.'
  },
  {
    id: 'bandit-atp',
    name: 'Радио АТП',
    locations: ['atp'],
    description: 'Эфир с территории автотранспортного предприятия.'
  },
  {
    id: 'south-checkpoint',
    name: 'Радио Южного блокпоста',
    locations: ['south-checkpoint'],
    description: 'Военный эфир южного блокпоста.'
  }
];

export function getRadioStationForLocation(locationId) {
  return RADIO_STATIONS.find(station => station.locations.includes(locationId)) || null;
}
