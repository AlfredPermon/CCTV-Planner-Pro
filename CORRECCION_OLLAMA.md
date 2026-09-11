# 🔧 Corrección de Conexión con Ollama - BotIp Asistente CCTV

## 📋 Problema Identificado

El bot "BotIp - Asistente CCTV" no se conectaba correctamente con Ollama local y solo respondía con el mensaje genérico:
> "Indique si busca definición, características, comparación o aplicación, o pida dimensionamiento del proyecto."

### Causas Raíz Detectadas

1. **Falta de diagnóstico claro**: El código original no diferenciaba entre:
   - Ollama no está instalado/ejecutándose
   - Ollama está corriendo pero el modelo no está descargado
   - Error durante la petición al modelo

2. **Mensajes de error poco útiles**: El usuario no recibía información sobre cómo solucionar el problema

3. **Sin feedback visual**: La interfaz no mostraba el estado de conexión con Ollama

4. **Logging insuficiente**: No había trazas para depurar problemas de conexión

---

## ✅ Soluciones Implementadas

### 1. Backend (`/src/app/api/assistant/route.ts`)

#### Mejoras en el Manejo de Errores

```typescript
// Diagnóstico detallado del estado de Ollama
const healthCheck = await ensureModelAvailable()

if (!healthCheck.ok) {
  // Ollama no es alcanzable
  response = '⚠️ **Ollama no está disponible**: El servidor local de Ollama no responde...'
} else if (!healthCheck.available) {
  // Modelo no disponible
  response = `⚠️ **Modelo no disponible**: El modelo "${cfg.model}" no está descargado...`
}
```

#### Logging Enriquecido

```typescript
logger.info('[Assistant] Nueva solicitud', { intent, messageLength, camerasCount })
logger.info('[Assistant] Estado de salud de Ollama', healthCheck)
logger.error('[Assistant] Error durante la petición a Ollama', { error })
```

#### Respuestas Contextualizadas

- **Ollama desconectado**: Instrucciones paso a paso para iniciar el servicio
- **Modelo faltante**: Lista de modelos disponibles + comando exacto para descargar
- **Error en petición**: Mensaje técnico con detalles del error

---

### 2. Frontend (`/src/components/cctv/AssistantPanel.tsx`)

#### Indicador de Estado en Tiempo Real

```typescript
const [ollamaStatus, setOllamaStatus] = useState<
  'unknown' | 'connected' | 'disconnected' | 'model_missing'
>('unknown')
```

**Badges visuales**:
- 🟢 **Ollama Conectado** (verde)
- 🔴 **Ollama Desconectado** (rojo)
- ⚪ **Modelo No Disponible** (gris)

#### Verificación Automática al Cargar

```typescript
useEffect(() => {
  const checkOllamaStatus = async () => {
    const response = await fetch('/api/ollama/health')
    const data = await response.json()
    
    if (!data.reachable) {
      setOllamaStatus('disconnected')
      // Mostrar mensaje de sistema
    } else if (!data.model_available) {
      setOllamaStatus('model_missing')
      // Mostrar mensaje de sistema
    } else {
      setOllamaStatus('connected')
    }
  }
  checkOllamaStatus()
}, [])
```

#### Mensajes del Sistema

Los mensajes de sistema ahora tienen:
- Icono de alerta (⚠️)
- Estilo visual distintivo (borde rojo, fondo tenue)
- Instrucciones accionables

#### Comandos Rápidos

Se agregaron botones predefinidos para:
- 📹 Definición de cámara domo
- ⚙️ Características técnicas
- 📐 Dimensionar proyecto
- 🔄 Comparación de dispositivos

#### Mejoras de UX

- **Soporte para Enter**: Enviar mensaje con tecla Enter
- **Loading indicator**: "Procesando pregunta..." mientras espera respuesta
- **Whitespace pre-wrap**: Formato de texto preservado en respuestas
- **Mensaje inicial mejorado**: Más amigable y descriptivo

---

## 🚀 Cómo Usar

### Requisitos Previos

1. **Instalar Ollama** (si no está instalado):
   ```bash
   # En macOS
   brew install ollama
   
   # En Windows (PowerShell como Admin)
   winget install Ollama.Ollama
   
   # En Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Iniciar el servidor de Ollama**:
   ```bash
   ollama serve
   ```

3. **Descargar el modelo configurado** (por defecto `deepseek-r1:1.5b`):
   ```bash
   ollama pull deepseek-r1:1.5b
   ```

   O verificar qué modelos tienes disponibles:
   ```bash
   ollama list
   ```

### Configuración de Variables de Entorno (Opcional)

Crear archivo `.env.local` en la raíz del proyecto:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:1.5b
LOG_LEVEL=info
```

### Verificar Estado de Ollama desde la Aplicación

1. Abrir la interfaz de BotIp - Asistente CCTV
2. Observar el badge en la esquina superior derecha del panel:
   - 🟢 "Ollama Conectado" → Todo correcto
   - 🔴 "Ollama Desconectado" → Iniciar `ollama serve`
   - ⚪ "Modelo No Disponible" → Descargar modelo con `ollama pull`

---

## 🧪 Pruebas

### Escenario 1: Ollama Funcionando Correctamente

```bash
# Terminal 1
ollama serve

# Terminal 2
ollama list  # Debe mostrar el modelo configurado
```

**Resultado esperado**: Badge verde, respuestas de IA fluidas.

### Escenario 2: Ollama Detenido

```bash
# Detener Ollama (Ctrl+C en la terminal donde corre)
```

**Resultado esperado**: 
- Badge rojo "Ollama Desconectado"
- Mensaje de sistema con instrucciones para iniciar
- Respuestas fallback con conocimiento embebido disponibles

### Escenario 3: Modelo No Disponible

```bash
# Ollama corriendo pero sin el modelo
ollama list  # No muestra el modelo configurado
```

**Resultado esperado**:
- Badge gris "Modelo No Disponible"
- Mensaje con lista de modelos disponibles
- Instrucción exacta: `ollama pull <nombre-modelo>`

---

## 📊 Flujo de Diagnóstico

```
Usuario envía pregunta
       ↓
¿Intent específico? (definición/carácterísticas/dimensionamiento)
       ├─ Sí → Responder con conocimiento embebido ✅
       └─ No → Intentar conectar con Ollama
                ↓
         ¿Ollama reachable?
                ├─ No → Error: "Ollama no está disponible" + instrucciones
                └─ Sí → ¿Modelo disponible?
                         ├─ No → Error: "Modelo no disponible" + lista modelos
                         └─ Sí → Enviar petición a API /api/chat
                                  ├─ Éxito → Mostrar respuesta de IA ✅
                                  └─ Error → Mostrar error técnico
```

---

## 🛠️ Debugging Avanzado

### Ver Logs del Servidor

Los logs se muestran en la consola donde corre Next.js:

```bash
npm run dev  # o npm start en producción
```

Buscar líneas como:
```
[Assistant] Nueva solicitud { intent: 'otro', messageLength: 45 }
[Assistant] Estado de salud de Ollama { ok: true, available: false, models: [...] }
[Assistant] Ollama no es alcanzable { error: 'server_unreachable' }
```

### Endpoint de Salud Directo

```bash
curl http://localhost:3000/api/ollama/health | jq
```

Respuesta esperada:
```json
{
  "base_url": "http://localhost:11434",
  "model": "deepseek-r1:1.5b",
  "reachable": true,
  "models": ["deepseek-r1:1.5b", "llama3.1"],
  "model_available": true
}
```

### Forzar Re-check de Estado

En la consola del navegador (F12):
```javascript
fetch('/api/ollama/health').then(r => r.json()).then(console.log)
```

---

## 📝 Archivos Modificados

| Archivo | Cambios Principales |
|---------|---------------------|
| `/src/app/api/assistant/route.ts` | Logging, diagnóstico detallado, mensajes de error contextualizados |
| `/src/components/cctv/AssistantPanel.tsx` | Indicador de estado, verificación automática, comandos rápidos, UX mejorada |

---

## 🎯 Beneficios Obtenidos

1. **Diagnóstico inmediato**: El usuario sabe exactamente qué está mal
2. **Instrucciones accionables**: Pasos claros para resolver cada problema
3. **Feedback visual**: Estado visible en todo momento
4. **Resiliencia**: El bot sigue funcionando con conocimiento embebido si Ollama falla
5. **Depuración simplificada**: Logs estructurados para desarrollo
6. **Mejor UX**: Comandos rápidos, loading states, formato preservado

---

## 🔮 Próximas Mejoras Sugeridas

- [ ] Selector de modelo en UI para cambiar dinámicamente
- [ ] Auto-download de modelo si no está disponible
- [ ] Cola de peticiones para evitar timeouts
- [ ] Historial de conversaciones persistente
- [ ] Soporte para múltiples sesiones simultáneas
- [ ] Exportar conversación a PDF/Markdown

---

**Fecha de implementación**: $(date +%Y-%m-%d)  
**Versión del fix**: 1.0.0
