import { useState } from 'react'
import './App.css'

const sentiments = ['positive', 'neutral', 'negative']
const topics = ['quality', 'delivery', 'price', 'packaging', 'support', 'size_fit', 'other']
const label = (value) => value.replace('_', ' / ')

async function request(path, options) {
  const response = await fetch(path, options)
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    throw new Error(typeof data?.detail === 'string' ? data.detail : 'The server could not complete this request.')
  }
  return data
}

function Reply({ text }) {
  const [state, setState] = useState({})
  async function generate() {
    setState({ busy: true })
    try {
      const { reply } = await request('/api/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_text: text }),
      })
      setState({ reply })
    } catch (error) {
      setState({ error: error.message })
    }
  }
  return state.reply ? <p>{state.reply}</p> : (
    <>
      <button type="button" disabled={state.busy} onClick={generate}>
        {state.busy ? 'Generating…' : 'Suggest reply'}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
    </>
  )
}

function Themes({ title, items }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {items.length ? <ol>{items.map(({ topic, count, example }) => (
        <li key={topic}><strong>{label(topic)} · {count}</strong><p>{example}</p></li>
      ))}</ol> : <p>No matching themes yet.</p>}
    </section>
  )
}

function Filter({ name, options, value, onChange }) {
  return (
    <label>{name}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {options.map((option) => <option key={option} value={option}>{label(option)}</option>)}
      </select>
    </label>
  )
}

export default function App() {
  const [file, setFile] = useState(null)
  const [job, setJob] = useState({})
  const [product, setProduct] = useState('')
  const [sentiment, setSentiment] = useState('')
  const [topic, setTopic] = useState('')

  async function upload(event) {
    event.preventDefault()
    const body = new FormData()
    body.set('file', file)
    setJob({ busy: true })
    setProduct('')
    setSentiment('')
    setTopic('')
    try {
      const data = await request('/api/analyse', { method: 'POST', body })
      setJob({ data })
    } catch (error) {
      setJob({ error: error.message })
    }
  }

  const data = job.data
  const reviews = data?.reviews ?? []
  const visible = reviews.filter((row) => (!product || row.product === product)
    && (!sentiment || row.analysis?.sentiment === sentiment)
    && (!topic || row.analysis?.topics.includes(topic)))

  return (
    <main>
      <header><span>ReviewLens</span><h1>Customer review insights</h1></header>
      <form className="panel upload" onSubmit={upload}>
        <label>Upload reviews CSV
          <input type="file" accept=".csv,text/csv" required disabled={job.busy}
            onChange={(event) => setFile(event.target.files[0])} />
        </label>
        <button disabled={!file || job.busy}>{job.busy ? 'Analysing…' : 'Analyse reviews'}</button>
        {job.busy && <p role="status">Processing reviews in batches. This can take a minute.</p>}
        {job.error && <p role="alert">{job.error}</p>}
      </form>
      {data && (
        <>
          <section className="metrics" aria-label="Review summary">
            <article>Analysed<strong>{data.dashboard.total}</strong></article>
            {sentiments.map((name) => <article key={name}>{name}<strong>{data.dashboard.sentiment[name]}%</strong></article>)}
            <article>Need a reply<strong>{data.dashboard.needs_reply}</strong></article>
            <article>Rating agreement<strong>{data.dashboard.agreement === null ? '—' : data.dashboard.agreement + '%'}</strong></article>
          </section>
          <p className="run">Skipped {data.skipped.empty} empty, {data.skipped.duplicate} duplicate and {data.skipped.malformed} malformed ·
            {' '}{reviews.length - data.dashboard.total} failed · {data.metrics.api_calls} AI calls · {data.metrics.cached} cached · {data.metrics.seconds}s</p>
          <div className="themes">
            <Themes title="Top complaints" items={data.dashboard.complaints} />
            <Themes title="Top praises" items={data.dashboard.praises} />
          </div>
          <section className="panel">
            <h2>Reviews</h2>
            <div className="filters">
              <Filter name="Product" options={[...new Set(reviews.map((row) => row.product))].sort()} value={product} onChange={setProduct} />
              <Filter name="Sentiment" options={sentiments} value={sentiment} onChange={setSentiment} />
              <Filter name="Topic" options={topics} value={topic} onChange={setTopic} />
            </div>
            <p>{visible.length} of {reviews.length} reviews</p>
            {!!visible.length && <div className="scroll"><table>
              <thead><tr><th>Product</th><th>Review</th><th>Sentiment</th><th>Topics</th><th>Store reply</th></tr></thead>
              <tbody>{visible.map((row) => (
                <tr key={row.key}>
                  <td><strong>{row.product}</strong><p>{row.review_id} · {row.rating ?? 'Unknown'}{row.rating !== null && '/5'}</p>
                    {row.rating_mismatch && <small>Rating mismatch</small>}</td>
                  <td>{row.analysis?.summary ?? 'Analysis failed'}<details><summary>Original review</summary>{row.review_text}</details></td>
                  <td className={row.analysis?.sentiment}>{row.analysis?.sentiment ?? '—'}</td>
                  <td>{row.analysis?.topics.map(label).join(', ') ?? '—'}</td>
                  <td>{row.analysis?.needs_reply ? <Reply text={row.review_text} /> : '—'}</td>
                </tr>
              ))}</tbody>
            </table></div>}
          </section>
        </>
      )}
    </main>
  )
}
