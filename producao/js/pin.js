// Senha de 4 dígitos por pessoa.
//
// Na primeira entrada a pessoa cria a senha; nas próximas o app pede.
// Guardamos só o hash (SHA-256 do id da pessoa + a senha), nunca os dígitos.
//
// Isso tranca a troca de perfil no aparelho — impede que alguém pegue o celular
// destravado e entre como outra pessoa. Não é segurança de servidor: no modo
// demo os dados ficam no próprio aparelho e quem souber mexer no navegador
// alcança tudo. A trava de verdade vem no modo nuvem, com o login por e-mail.
import { store } from './store.js';
import { el, sheet, toast } from './ui.js';
import { esc } from './utils.js';

async function digest(txt) {
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Navegador sem Web Crypto: guarda um resumo fraco, só para não deixar o número à vista.
  let h = 5381;
  for (let i = 0; i < txt.length; i++) h = ((h * 33) ^ txt.charCodeAt(i)) >>> 0;
  return 'fraco:' + h.toString(16);
}

export const temSenha = (m) => Boolean(m?.pin_hash);
export const hashSenha = (membroId, pin) => digest(`unit0:${membroId}:${pin}`);

export async function definirSenha(membro, pin) {
  await store.update('membros', membro.id, { pin_hash: await hashSenha(membro.id, pin) });
}
export async function limparSenha(membroId) {
  await store.update('membros', membroId, { pin_hash: '' });
}
export async function conferirSenha(membro, pin) {
  return membro.pin_hash === await hashSenha(membro.id, pin);
}

const valido = (v) => /^\d{4}$/.test(v);

/**
 * Pede a senha da pessoa. Na primeira vez, manda criar.
 * Devolve true quando pode entrar.
 */
export function autenticar(membro) {
  return new Promise((resolve) => {
    const criando = !temSenha(membro);
    let resolvido = false;
    let tentativas = 0;

    const corpo = el(`<div>
      <p class="small muted" style="margin:0 0 16px">${criando
        ? 'Primeira vez aqui. Escolha uma senha de 4 dígitos — ela vai ser pedida nas próximas entradas.'
        : `Digite a senha de 4 dígitos de ${esc(membro.nome)}.`}</p>
      <div class="f">
        <label for="pin1">${criando ? 'Nova senha' : 'Senha'}</label>
        <input id="pin1" class="pin" type="password" inputmode="numeric" pattern="[0-9]*"
          maxlength="4" autocomplete="off" placeholder="••••">
      </div>
      ${criando ? `<div class="f"><label for="pin2">Repita a senha</label>
        <input id="pin2" class="pin" type="password" inputmode="numeric" pattern="[0-9]*"
          maxlength="4" autocomplete="off" placeholder="••••"></div>` : ''}
      <div class="small muted" data-msg style="min-height:18px"></div>
      ${criando ? '' : '<p class="small muted" style="margin-top:14px">Esqueceu? Peça para o Master zerar a sua senha em Equipe.</p>'}
    </div>`);

    const rod = el('<div style="display:flex;gap:8px;width:100%"></div>');
    const bN = el('<button class="btn gho" style="flex:1">Cancelar</button>');
    const bS = el(`<button class="btn pri" style="flex:1">${criando ? 'Criar e entrar' : 'Entrar'}</button>`);
    rod.append(bN, bS);

    const sh = sheet({
      titulo: membro.nome,
      corpo,
      rodape: rod,
      aoFechar: () => { if (!resolvido) resolve(false); }
    });

    const p1 = corpo.querySelector('#pin1');
    const p2 = corpo.querySelector('#pin2');
    const msg = corpo.querySelector('[data-msg]');
    const erro = (t) => { msg.textContent = t; msg.style.color = 'var(--bad)'; };
    setTimeout(() => p1.focus(), 250);

    [p1, p2].filter(Boolean).forEach((i) => {
      i.oninput = () => { i.value = i.value.replace(/\D/g, '').slice(0, 4); msg.textContent = ''; };
      i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); bS.click(); } };
    });

    bN.onclick = () => { resolvido = true; sh.close(); resolve(false); };
    bS.onclick = async () => {
      const a = p1.value;
      if (!valido(a)) return erro('A senha tem 4 dígitos.');
      if (criando) {
        if (a !== p2.value) return erro('As duas senhas não são iguais.');
        await definirSenha(membro, a);
        resolvido = true; sh.close(); toast('Senha criada.'); resolve(true);
        return;
      }
      if (await conferirSenha(membro, a)) {
        resolvido = true; sh.close(); resolve(true);
        return;
      }
      tentativas++;
      p1.value = '';
      erro(tentativas >= 3 ? 'Senha errada. Peça para o Master zerar a sua senha.' : 'Senha errada. Tente de novo.');
    };
  });
}

/** Trocar a própria senha, já sabendo a atual. */
export function trocarSenha(membro) {
  return new Promise((resolve) => {
    let resolvido = false;
    const corpo = el(`<div>
      ${temSenha(membro) ? `<div class="f"><label for="atual">Senha atual</label>
        <input id="atual" class="pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••"></div>` : ''}
      <div class="f"><label for="nova">Nova senha</label>
        <input id="nova" class="pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••"></div>
      <div class="f"><label for="nova2">Repita a nova senha</label>
        <input id="nova2" class="pin" type="password" inputmode="numeric" maxlength="4" placeholder="••••"></div>
      <div class="small muted" data-msg style="min-height:18px"></div>
    </div>`);
    const rod = el('<div style="display:flex;gap:8px;width:100%"></div>');
    const bS = el('<button class="btn pri" style="flex:1">Salvar senha</button>');
    rod.append(bS);
    const sh = sheet({ titulo: 'Trocar senha', corpo, rodape: rod, aoFechar: () => { if (!resolvido) resolve(false); } });
    const msg = corpo.querySelector('[data-msg]');
    const erro = (t) => { msg.textContent = t; msg.style.color = 'var(--bad)'; };
    corpo.querySelectorAll('input').forEach((i) => {
      i.oninput = () => { i.value = i.value.replace(/\D/g, '').slice(0, 4); msg.textContent = ''; };
    });
    bS.onclick = async () => {
      const atual = corpo.querySelector('#atual');
      const nova = corpo.querySelector('#nova').value;
      const nova2 = corpo.querySelector('#nova2').value;
      if (atual && !await conferirSenha(membro, atual.value)) return erro('Senha atual errada.');
      if (!valido(nova)) return erro('A senha tem 4 dígitos.');
      if (nova !== nova2) return erro('As duas senhas não são iguais.');
      await definirSenha(membro, nova);
      resolvido = true; sh.close(); toast('Senha trocada.'); resolve(true);
    };
  });
}
