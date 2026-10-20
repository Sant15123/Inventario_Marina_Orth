import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, initDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 0. Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', server: 'inventario-marina-orth-api', time: new Date().toISOString() });
});

// 1. GET /api/activos - Lista todos los activos ordenados por placa
app.get('/api/activos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activos ORDER BY placa ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar activos:', err);
    res.status(500).json({ success: false, error: 'Error al obtener activos' });
  }
});

// 2. GET /api/activos/:placa - Retorna un activo específico por su placa (para QR o detalle)
app.get('/api/activos/:placa', async (req, res) => {
  try {
    const { placa } = req.params;
    const result = await pool.query(
      'SELECT * FROM activos WHERE LOWER(placa) = LOWER($1)',
      [placa.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Activo con placa ${placa} no encontrado` });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al obtener activo por placa:', err);
    res.status(500).json({ success: false, error: 'Error al buscar activo' });
  }
});

// 3. POST /api/activos - Registra un nuevo activo tecnológico
app.post('/api/activos', async (req, res) => {
  try {
    const {
      placa,
      nombre,
      marca,
      modelo,
      serial,
      sede = 'Medellín',
      ubicacion,
      ubicacion_estante = null,
      estado = 'Disponible',
      custodio = null,
      fecha_devolucion = null
    } = req.body;

    if (!placa || !nombre) {
      return res.status(400).json({ success: false, message: 'La placa y el nombre son obligatorios.' });
    }

    const result = await pool.query(
      `INSERT INTO activos (placa, nombre, marca, modelo, serial, sede, estado, custodio, fecha_devolucion, ubicacion_estante)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        placa.trim(),
        nombre.trim(),
        marca || null,
        modelo || null,
        serial ? serial.trim() : null,
        sede,
        estado,
        custodio,
        fecha_devolucion,
        ubicacion_estante ? ubicacion_estante.trim() : null
      ]
    );

    res.status(201).json({ success: true, message: 'Activo registrado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al registrar activo:', err);
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'Ya existe un activo con esa placa o número serial.' });
    }
    res.status(500).json({ success: false, error: 'Error al guardar el activo' });
  }
});

// 3.1 PUT /api/activos/:placa - Actualiza un activo tecnológico
app.put('/api/activos/:placa', async (req, res) => {
  try {
    const { placa } = req.params;
    const {
      nombre,
      marca,
      modelo,
      serial,
      sede,
      ubicacion_estante,
      estado,
      custodio,
      fecha_devolucion
    } = req.body;

    const result = await pool.query(
      `UPDATE activos
       SET nombre = COALESCE($1, nombre),
           marca = COALESCE($2, marca),
           modelo = COALESCE($3, modelo),
           serial = COALESCE($4, serial),
           sede = COALESCE($5, sede),
           ubicacion_estante = COALESCE($6, ubicacion_estante),
           estado = COALESCE($7, estado),
           custodio = COALESCE($8, custodio),
           fecha_devolucion = COALESCE($9, fecha_devolucion)
       WHERE LOWER(placa) = LOWER($10)
       RETURNING *`,
      [
        nombre,
        marca,
        modelo,
        serial,
        sede,
        ubicacion_estante !== undefined ? ubicacion_estante : null,
        estado,
        custodio,
        fecha_devolucion,
        placa.trim()
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Activo no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar activo:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar activo' });
  }
});

// 4. GET /api/consumibles - Lista los materiales con su stock disponible y mínimo
app.get('/api/consumibles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM consumibles ORDER BY material ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar consumibles:', err);
    res.status(500).json({ success: false, error: 'Error al obtener consumibles' });
  }
});

// 4.1 POST /api/consumibles - Registra un nuevo consumible / insumo
app.post('/api/consumibles', async (req, res) => {
  try {
    const {
      id,
      material,
      categoria = 'Robótica',
      disponible = 0,
      minimo = 5,
      ubicacion = 'Oficina FMO',
      ubicacion_estante = null
    } = req.body;

    if (!id || !material) {
      return res.status(400).json({ success: false, message: 'El id/código y el nombre del material son obligatorios.' });
    }

    const result = await pool.query(
      `INSERT INTO consumibles (id, material, categoria, disponible, minimo, ubicacion, ubicacion_estante)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id.trim(),
        material.trim(),
        categoria,
        Number(disponible) || 0,
        Number(minimo) || 5,
        ubicacion,
        ubicacion_estante ? ubicacion_estante.trim() : null
      ]
    );

    res.status(201).json({ success: true, message: 'Consumible registrado exitosamente', data: result.rows[0] });
  } catch (err) {
    console.error('Error al registrar consumible:', err);
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'Ya existe un consumible con ese código.' });
    }
    res.status(500).json({ success: false, error: 'Error al guardar el consumible' });
  }
});

// 4.2 PUT /api/consumibles/:id - Actualiza un consumible / insumo
app.put('/api/consumibles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      material,
      categoria,
      disponible,
      minimo,
      ubicacion,
      ubicacion_estante
    } = req.body;

    const result = await pool.query(
      `UPDATE consumibles
       SET material = COALESCE($1, material),
           categoria = COALESCE($2, categoria),
           disponible = COALESCE($3, disponible),
           minimo = COALESCE($4, minimo),
           ubicacion = COALESCE($5, ubicacion),
           ubicacion_estante = COALESCE($6, ubicacion_estante)
       WHERE LOWER(id) = LOWER($7)
       RETURNING *`,
      [
        material,
        categoria,
        disponible !== undefined ? Number(disponible) : null,
        minimo !== undefined ? Number(minimo) : null,
        ubicacion,
        ubicacion_estante !== undefined ? ubicacion_estante : null,
        id.trim()
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Consumible no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al actualizar consumible:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar consumible' });
  }
});

// GET /api/prestamos - Lista historial de préstamos
app.get('/api/prestamos', async (req, res) => {
  try {
    const query = `
      SELECT p.*, a.nombre as nombre_activo, a.marca, a.modelo
      FROM prestamos p
      LEFT JOIN activos a ON LOWER(p.placa_activo) = LOWER(a.placa)
      ORDER BY p.id DESC
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar préstamos:', err);
    res.status(500).json({ success: false, error: 'Error al obtener préstamos' });
  }
});

// 5. POST /api/prestamos - Registra un préstamo en transacción (inserta préstamo + actualiza activo)
app.post('/api/prestamos', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      placa_activo,
      solicitante,
      sede = 'Medellín',
      motivo = '',
      fecha_salida,
      fecha_devolucion_esperada
    } = req.body;

    if (!placa_activo || !solicitante || !fecha_devolucion_esperada) {
      return res.status(400).json({
        success: false,
        message: 'placa_activo, solicitante y fecha_devolucion_esperada son requeridos.'
      });
    }

    await client.query('BEGIN');

    // Verificar si el activo existe
    const activoRes = await client.query(
      'SELECT * FROM activos WHERE LOWER(placa) = LOWER($1) FOR UPDATE',
      [placa_activo.trim()]
    );

    if (activoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: `El activo con placa ${placa_activo} no existe.` });
    }

    const activoActual = activoRes.rows[0];

    // Registrar préstamo
    const prestamoRes = await client.query(
      `INSERT INTO prestamos (placa_activo, solicitante, sede, motivo, fecha_salida, fecha_devolucion_esperada, estado)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, 'Activo')
       RETURNING *`,
      [
        activoActual.placa,
        solicitante.trim(),
        sede,
        motivo,
        fecha_salida || null,
        fecha_devolucion_esperada
      ]
    );

    // Actualizar activo: estado = 'En campo', custodio = solicitante, fecha_devolucion = fecha_esperada
    await client.query(
      `UPDATE activos
       SET estado = 'En campo',
           custodio = $1,
           fecha_devolucion = $2
       WHERE placa = $3`,
      [solicitante.trim(), fecha_devolucion_esperada, activoActual.placa]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Préstamo registrado exitosamente y activo actualizado',
      data: prestamoRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar préstamo:', err);
    res.status(500).json({ success: false, error: 'Error al registrar préstamo en base de datos' });
  } finally {
    client.release();
  }
});

// 6. PUT /api/prestamos/:id/devolver - Marca préstamo como 'Devuelto' y restaura activo
app.put('/api/prestamos/:id/devolver', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Buscar préstamo
    const prestamoRes = await client.query(
      'SELECT * FROM prestamos WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (prestamoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Préstamo no encontrado' });
    }

    const prestamo = prestamoRes.rows[0];

    // Marcar como devuelto
    const updatedPrestamoRes = await client.query(
      `UPDATE prestamos
       SET estado = 'Devuelto',
           fecha_devolucion_real = CURRENT_DATE
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Revertir estado del activo
    await client.query(
      `UPDATE activos
       SET estado = 'Disponible',
           custodio = NULL,
           fecha_devolucion = NULL
       WHERE LOWER(placa) = LOWER($1)`,
      [prestamo.placa_activo]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Préstamo marcado como devuelto y activo disponible nuevamente',
      data: updatedPrestamoRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al devolver préstamo:', err);
    res.status(500).json({ success: false, error: 'Error al procesar la devolución' });
  } finally {
    client.release();
  }
});

// 7. GET /api/consumibles/remisiones - Lista las remisiones agrupadas de consumibles
app.get('/api/consumibles/remisiones', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM remisiones_consumibles ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar remisiones:', err);
    res.status(500).json({ success: false, error: 'Error al obtener remisiones de consumibles' });
  }
});

// 8. POST /api/consumibles/remisiones - Crea una remisión agrupada y descuenta el stock de cada material
app.post('/api/consumibles/remisiones', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      responsable_recibe,
      sede = 'Medellín',
      proyecto = '',
      motivo = '',
      items = [],
    } = req.body;

    if (!responsable_recibe) {
      return res.status(400).json({ success: false, message: 'responsable_recibe es obligatorio.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe incluir al menos un ítem en la remisión.' });
    }

    await client.query('BEGIN');

    // Generar consecutivo tipo REM-2026-0001
    const year = new Date().getFullYear();
    const countRes = await client.query('SELECT COUNT(*) FROM remisiones_consumibles');
    const nextSeq = parseInt(countRes.rows[0].count, 10) + 1;
    const remision_id = `REM-${year}-${String(nextSeq).padStart(4, '0')}`;
    const codigo_acta = remision_id;

    let total_unidades = 0;
    const itemsProcesados = [];

    for (const item of items) {
      const matId = item.material_id || item.id;
      const cant = Number(item.cantidad || item.cantidadEntrega) || 1;
      const matNombre = item.material || item.material_nombre || item.nombre || `Consumible (${matId})`;

      // Descontar stock en la tabla consumibles
      const updateRes = await client.query(
        `UPDATE consumibles
         SET disponible = GREATEST(0, disponible - $1)
         WHERE LOWER(id) = LOWER($2)
         RETURNING *`,
        [cant, matId]
      );

      // Registrar también en entregas individuales para compatibilidad
      await client.query(
        `INSERT INTO entregas_consumibles (remision_id, material_id, material_nombre, cantidad, responsable, sede, proyecto_motivo, tipo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Consumido')`,
        [remision_id, matId, matNombre, cant, responsable_recibe.trim(), sede, motivo || proyecto]
      );

      total_unidades += cant;
      itemsProcesados.push({
        material_id: matId,
        nombre: matNombre,
        cantidad: cant,
        stock_restante: updateRes.rows[0]?.disponible ?? null,
      });
    }

    // Insertar el contenedor de remisión
    const remisionRes = await client.query(
      `INSERT INTO remisiones_consumibles 
       (remision_id, codigo_acta, fecha_entrega, responsable_recibe, sede, proyecto, motivo, items, total_items, total_unidades)
       VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7::jsonb, $8, $9)
       RETURNING *`,
      [
        remision_id,
        codigo_acta,
        responsable_recibe.trim(),
        sede,
        proyecto,
        motivo,
        JSON.stringify(itemsProcesados),
        itemsProcesados.length,
        total_unidades,
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Remisión ${remision_id} registrada con éxito`,
      data: remisionRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar remisión de consumibles:', err);
    res.status(500).json({ success: false, error: err.message || 'Error al guardar remisión' });
  } finally {
    client.release();
  }
});

// 9. GET /api/consumibles/entregas - Lista entregas individuales o remisiones para compatibilidad
app.get('/api/consumibles/entregas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM entregas_consumibles ORDER BY id DESC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error al listar entregas individuales:', err);
    res.status(500).json({ success: false, error: 'Error al obtener entregas de consumibles' });
  }
});

// 10. POST /api/consumibles/entregas - Endpoint simple de entrega
app.post('/api/consumibles/entregas', async (req, res) => {
  try {
    const { material_id, material_nombre, cantidad = 1, responsable, sede = 'Medellín', proyecto_motivo = '' } = req.body;
    const result = await pool.query(
      `INSERT INTO entregas_consumibles (material_id, material_nombre, cantidad, responsable, sede, proyecto_motivo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [material_id, material_nombre, Number(cantidad), responsable, sede, proyecto_motivo]
    );
    // Descontar en consumibles
    await pool.query(
      'UPDATE consumibles SET disponible = GREATEST(0, disponible - $1) WHERE LOWER(id) = LOWER($2)',
      [Number(cantidad), material_id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error al crear entrega individual:', err);
    res.status(500).json({ success: false, error: 'Error al registrar entrega' });
  }
});

// Iniciar servidor tras verificar DB
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`🚀 Servidor backend corriendo exitosamente en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Falló la inicialización del servidor debido a la base de datos:', err);
    process.exit(1);
  }
}

startServer();

export default app;
