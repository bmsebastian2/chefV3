'use client'

import { useEffect, useMemo, useState } from 'react'
import { geoMercator, geoPath } from 'd3-geo'

const GEOJSON_URL = '/maps/data/nicaragua-departamentos.min.geojson'

/** Feature de departamento tal como viene en el geojson local. */
type DepartmentFeature = {
  type: 'Feature'
  properties: { id: string; name: string; slug: string }
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
}

type DepartmentCollection = {
  type: 'FeatureCollection'
  features: DepartmentFeature[]
}

/** Departamento ya proyectado y listo para pintar en el SVG. */
export type ProjectedDepartment = {
  id: string
  name: string
  /** Atributo `d` del <path>. */
  d: string
  /** Centroide en coordenadas de pantalla, para etiquetas / fallback de pines. */
  centroid: [number, number]
}

export type MercatorProjection = {
  ready: boolean
  departments: ProjectedDepartment[]
  /** Proyecta [lng, lat] → [x, y] en pantalla, o `null` si aún no hay proyección. */
  project: (lngLat: [number, number]) => [number, number] | null
}

// Cache a nivel de módulo: el geojson se descarga una sola vez por sesión.
let cachedCollection: DepartmentCollection | null = null
let inflight: Promise<DepartmentCollection> | null = null

function loadCollection(): Promise<DepartmentCollection> {
  if (cachedCollection) return Promise.resolve(cachedCollection)
  if (!inflight) {
    inflight = fetch(GEOJSON_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`No se pudo cargar el mapa (${res.status})`)
        return res.json() as Promise<DepartmentCollection>
      })
      .then((fc) => {
        cachedCollection = fc
        return fc
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/**
 * Carga el geojson de departamentos (vía fetch desde /public, fuera del bundle)
 * y calcula una proyección Mercator ajustada a `width`×`height` con d3-geo.
 * Recalcula los paths solo cuando cambian las dimensiones o llega el geojson.
 */
export function useMercatorProjection(width: number, height: number): MercatorProjection {
  const [collection, setCollection] = useState<DepartmentCollection | null>(cachedCollection)

  useEffect(() => {
    if (collection) return
    let active = true
    loadCollection()
      .then((fc) => {
        if (active) setCollection(fc)
      })
      .catch((err) => {
        console.error('useMercatorProjection:', err)
      })
    return () => {
      active = false
    }
  }, [collection])

  const projection = useMemo(() => {
    if (!collection || width <= 0 || height <= 0) return null
    return geoMercator().fitSize([width, height], collection)
  }, [collection, width, height])

  const departments = useMemo<ProjectedDepartment[]>(() => {
    if (!collection || !projection) return []
    const pathGen = geoPath(projection)
    return collection.features.map((feature) => ({
      id: feature.properties.id,
      name: feature.properties.name,
      d: pathGen(feature) ?? '',
      centroid: pathGen.centroid(feature) as [number, number],
    }))
  }, [collection, projection])

  const project = useMemo(() => {
    return (lngLat: [number, number]): [number, number] | null => {
      if (!projection) return null
      const result = projection(lngLat)
      return result ? [result[0], result[1]] : null
    }
  }, [projection])

  return {
    ready: departments.length > 0,
    departments,
    project,
  }
}
