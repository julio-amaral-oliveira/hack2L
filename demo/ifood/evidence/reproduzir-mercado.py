import json, os, sys, time, subprocess

KEY = os.environ["GORILLA_API_KEY"]
BASE = "https://usegorilla.app/v1"
OUT = os.path.dirname(os.path.abspath(__file__))
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")


def req(url, data=None):
    # urllib bate em Cloudflare 1010; curl passa.
    cmd = ["curl", "-sS", "--max-time", "150", url,
           "-H", f"x-api-key: {KEY}", "-H", "Content-Type: application/json",
           "-H", f"User-Agent: {UA}", "-H", "Accept: application/json"]
    if data is not None:
        cmd += ["-X", "POST", "--data-binary", json.dumps(data)]
    out = subprocess.run(cmd, capture_output=True, text=True)
    try:
        return json.loads(out.stdout)
    except Exception as e:
        return {"_error": repr(e), "_stdout": out.stdout[:2000], "_stderr": out.stderr[:800]}


print("== billing ==", flush=True)
print(json.dumps(req(BASE + "/billing-status"), ensure_ascii=False)[:600], flush=True)


def arr(desc, props):
    return {
        "type": "array",
        "description": desc,
        "items": {
            "type": "object",
            "properties": props,
            "required": list(props.keys()),
            "additionalProperties": False,
        },
    }


ev = {"texto": {"type": "string"}, "evidencia_url": {"type": "string"}}

schema = {
    "type": "object",
    "properties": {
        "prospect": {"type": "string", "description": "Quem e o prospect, em uma frase"},
        "desejo_dominante": {"type": "string"},
        "estado_de_consciencia": {
            "type": "string",
            "enum": ["inconsciente", "consciente_do_problema", "consciente_da_solucao",
                     "consciente_do_produto", "mais_consciente"],
        },
        "estado_de_consciencia_justificativa": {"type": "string"},
        "sofisticacao_do_mercado": {
            "type": "integer",
            "description": "Estagio 1 a 5 da rubrica de Eugene Schwartz",
        },
        "sofisticacao_justificativa": {"type": "string"},
        "crencas": arr("Crencas que o prospect ja tem", ev),
        "objecoes": arr("Objecoes que impedem a acao", ev),
        "mencoes_concorrente": arr("Concorrentes citados e o motivo", {
            "concorrente": {"type": "string"}, "motivo": {"type": "string"},
            "evidencia_url": {"type": "string"}}),
        "linguagem_do_prospect": {
            "type": "array", "description": "Frases literais que o prospect usa",
            "items": {"type": "string"},
        },
        "mecanismo_sugerido": {
            "type": "string",
            "description": "Mecanismo novo que responde ao estagio de sofisticacao, sem repetir claim ja feito",
        },
        "prova": arr("Provas disponiveis para sustentar o mecanismo", ev),
    },
}
schema["required"] = list(schema["properties"].keys())
schema["additionalProperties"] = False

body = {
    "query": (
        "taxa do iFood come minha margem restaurante; "
        "sair do iFood dono de restaurante; "
        "99Food taxa zero vale a pena restaurante; "
        "iFood vs 99Food qual compensa para restaurante; "
        "comissao do iFood insustentavel pequeno restaurante"
    ),
    "mode": "ranked",
    "since": "3mo",
    "limit": 80,
    "custom_schema": schema,
}

print("\n== POST ==", flush=True)
p = req(BASE + "/v2-search-stream", body)
print(json.dumps(p, ensure_ascii=False)[:900], flush=True)
sid = p.get("search_id")
if not sid:
    sys.exit("sem search_id")

final = None
for i in range(80):
    time.sleep(3)
    r = req(f"{BASE}/v2-search-stream?id={sid}")
    st = r.get("status")
    print(f"poll {i+1}: status={st} total={r.get('total')} buckets={r.get('buckets')} done={r.get('done_sources')}", flush=True)
    if st and st != "running":
        final = r
        break

if not final:
    sys.exit("timeout no polling")

path = os.path.join(OUT, "gorilla_ifood.json")
json.dump(final, open(path, "w"), ensure_ascii=False, indent=2)
print(f"\nsalvo em {path}", flush=True)

print("\n== RESUMO ==", flush=True)
print("total:", final.get("total"), "| buckets:", final.get("buckets"),
      "| creditos gastos:", final.get("credits_charged"),
      "| restantes:", final.get("credits_remaining"), flush=True)
print("communities:", final.get("communities"), flush=True)
print("errors:", final.get("errors"), flush=True)

rows = final.get("results") or []
for t in ("hot", "warm"):
    sel = [x for x in rows if x.get("tier") == t][:12]
    print(f"\n--- {t.upper()} ({len(sel)} mostrados) ---", flush=True)
    for x in sel:
        print(f"[{x.get('source')}/{x.get('channel')}] score={x.get('result_score')} val={x.get('validation_score')} "
              f"arch={x.get('archetype')} signals={x.get('matched_signals')}", flush=True)
        print(f"  {x.get('title')}", flush=True)
        print(f"  {(x.get('body_snippet') or '')[:260]}", flush=True)
        print(f"  {x.get('url')}", flush=True)

print("\n== DATA (custom_schema) ==", flush=True)
print(json.dumps(final.get("data"), ensure_ascii=False, indent=2), flush=True)
