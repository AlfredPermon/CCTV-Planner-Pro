# Pruebas posteriores a limpieza y empaquetado

Fecha: 2026-05-20

## Suite de pruebas automatizadas

Comando:

```bash
npm test
```

Resultado: 10 archivos de prueba, 38 pruebas, todas aprobadas.

## Validación de integridad del paquete

Comandos:

```bash
npm run dist:refresh-manifest -- --hash-concurrency 12
npm run dist:validate -- --hash-concurrency 12
```

Resultado: integridad validada correctamente (8995 archivos verificados).

## Arranque del paquete (instalación/ejecución)

Comando:

```bash
npm run dist:start
```

Resultado: servidor iniciado y listo en `http://localhost:3000`.

