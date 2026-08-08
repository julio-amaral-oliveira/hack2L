"""Busca Gorilla: reacao do mercado aos concorrentes do iFood (99Food, Keeta).
Uso: GORILLA_API_KEY=grla_... python3 scripts/gorilla_competitor.py
"""
import json, os, sys, time, subprocess

KEY = os.environ["GORILLA_API_KEY"]
BASE = "https://usegorilla.app/v1"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")


def req(url, data=None):
    cmd = ["curl", "-sS", "--max-time", "150", url,
           "-H", f"x-api-key: {KEY}", "-H", "Content-Type: application/json",
           "-H", f"User-Agent: {UA}", "-H", "Accept: application/json"]
    if data is not None:
        cmd += ["-X", "POST", "--data-binary", json.dumps(data)]
    o = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(o.stdout)
    except Exception as e:
        return {"_error": repr(e), "_stdout": o.stdout[:1500]}


def arr(desc, props):
    return {"type": "array", "description": desc,
            "items": {"type": "object", "properties": props,
                      "required": list(props.keys()), "additionalProperties": False}}


schema = {
    "type": "object",
    "properties": {
        "resumo_da_reacao": {"type": "string",
            "description": "Como o mercado esta reagindo aos entrantes, em 3 frases"},
        "promessas_dos_entrantes": arr("Claims que 99Food/Keeta fizeram", {
            "player": {"type": "string"}, "promessa": {"type": "string"},
            "evidencia_url": {"type": "string"}}),
        "promessas_que_ja_quebraram": arr("Promessas que mudaram ou nao se sustentaram", {
            "player": {"type": "string"}, "o_que_mudou": {"type": "string"},
            "evidencia_url": {"type": "string"}}),
        "quem_migrou_e_o_que_aconteceu": arr("Relatos de quem trocou de plataforma", {
            "relato": {"type": "string"}, "resultado": {"type": "string"},
            "evidencia_url": {"type": "string"}}),
        "ceticismo_do_mercado": arr("Sinais de desconfianca com os entrantes", {
            "texto": {"type": "string"}, "evidencia_url": {"type": "string"}}),
        "vulnerabilidades_do_ifood": arr("Onde o iFood esta exposto", {
            "texto": {"type": "string"}, "evidencia_url": {"type": "string"}}),
        "angulo_defensivo_recomendado": {"type": "string",
            "description": "Como o iFood deveria responder, dado o estagio de sofisticacao 4"},
        "frases_literais": {"type": "array", "items": {"type": "string"},
            "description": "Falas cruas do mercado, verbatim"},
    },
}
schema["required"] = list(schema["properties"].keys())
schema["additionalProperties"] = False

body = {
    "query": (
        "99Food mudou a taxa 8,9% restaurante reclamacao; "
        "Keeta Meituan restaurante vale a pena taxa; "
        "sai do iFood fui para 99Food resultado vendas; "
        "99Food nao trouxe pedidos restaurante volume baixo; "
        "cupom 99Food Keeta consumidor migrou delivery"
    ),
    "mode": "ranked", "since": "3mo", "limit": 80, "custom_schema": schema,
}

print("== POST ==", flush=True)
p = req(BASE + "/v2-search-stream", body)
sid = p.get("search_id")
print(json.dumps(p, ensure_ascii=False)[:400], flush=True)
if not sid:
    sys.exit("sem search_id")

final = None
for i in range(80):
    time.sleep(3)
    r = req(f"{BASE}/v2-search-stream?id={sid}")
    st = r.get("status")
    print(f"poll {i+1}: {st} total={r.get('total')} buckets={r.get('buckets')}", flush=True)
    if st and st != "running":
        final = r
        break
if not final:
    sys.exit("timeout")

json.dump(final, open(os.path.join(OUT, "gorilla_concorrentes_raw.json"), "w"),
          ensure_ascii=False, indent=2)
json.dump(final.get("data"), open(os.path.join(OUT, "concorrentes_ifood.json"), "w"),
          ensure_ascii=False, indent=2)

print("\n== RESUMO ==", flush=True)
print("search_id:", final["search_id"], "| total:", final.get("total"),
      "| buckets:", final.get("buckets"),
      "| creditos:", final.get("credits_charged"),
      "| restantes:", final.get("credits_remaining"), flush=True)
print("duracao:", final.get("started_at"), "->", final.get("completed_at"), flush=True)

hot = sorted([x for x in final["results"] if (x.get("result_score") or 0) >= 0.7],
             key=lambda y: -(y.get("result_score") or 0))
print(f"\n--- HOT ({len(hot)}) ---", flush=True)
for x in hot[:14]:
    print("[%s/%s] %.2f | %s" % (x["source"], x.get("channel"), x["result_score"],
                                 (x.get("title") or "")[:110]), flush=True)
    print("   ", (x.get("body_snippet") or "").replace("\n", " ")[:230], flush=True)
    print("   ", x["url"], flush=True)

print("\n== DATA ==", flush=True)
print(json.dumps(final.get("data"), ensure_ascii=False, indent=2), flush=True)
