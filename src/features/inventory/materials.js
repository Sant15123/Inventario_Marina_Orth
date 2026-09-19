export const LOW_STOCK_THRESHOLD = 10

export const MATERIAL_CATEGORIES = [
  'Metal',
  'Madera',
  'Plástico',
  'Electrónica',
  'Herrajes',
  'Otros',
]

export const LABORATORIES = [
  'General',
  'Química',
  'Biología',
  'Microbiología',
  'Almacén A',
  'Almacén B',
]

export const materialSchema = {
  id: 'string',
  nombre: 'string',
  descripcion: 'string',
  cantidad: 'number',
  precio: 'number',
  categoria: 'string',
  ubicacion: 'string',
  createdAt: 'string',
  updatedAt: 'string',
}

export const STORAGE_KEY = 'marina-orth:materials'

export const initialMaterials = [
  {
    id: 'mat-001',
    nombre: 'Clavo de acero',
    descripcion: 'Clavo de acero inoxidable pulido',
    cantidad: 120,
    precio: 18.5,
    categoria: 'Metal',
    ubicacion: 'Química',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'mat-002',
    nombre: 'Madera de pino',
    descripcion: 'Tabla de pino de 2" x 4"',
    cantidad: 8,
    precio: 875.0,
    categoria: 'Madera',
    ubicacion: 'Almacén A',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'mat-003',
    nombre: 'Tuerca M8',
    descripcion: 'Tuerca de acero M8',
    cantidad: 450,
    precio: 2.25,
    categoria: 'Herrajes',
    ubicacion: 'Biología',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'mat-004',
    nombre: 'Tubo de ensamblaje',
    descripcion: 'Tubo de PVC de 1/2"',
    cantidad: 15,
    precio: 42.0,
    categoria: 'Plástico',
    ubicacion: 'Microbiología',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'mat-005',
    nombre: 'Cable de cobre',
    descripcion: 'Cable de cobre calibre 12',
    cantidad: 60,
    precio: 12.8,
    categoria: 'Electrónica',
    ubicacion: 'Química',
    createdAt: '',
    updatedAt: '',
  },
]

export function findMaterialById(materials, id) {
  return materials.find((m) => m.id === id)
}

export function isLowStock(material) {
  return Number(material.cantidad) <= LOW_STOCK_THRESHOLD
}

export function blankMaterial() {
  return {
    nombre: '',
    descripcion: '',
    cantidad: 0,
    precio: 0,
    categoria: '',
    ubicacion: '',
  }
}
