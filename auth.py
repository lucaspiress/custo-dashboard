import base64
import hashlib
import hmac
import secrets

import streamlit as st

import db


PBKDF2_ITERATIONS = 310_000
SESSION_KEY = "auth_user"


def password_hash(password: str, salt: bytes | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    return (
        base64.urlsafe_b64encode(digest).decode("ascii"),
        base64.urlsafe_b64encode(salt).decode("ascii"),
    )


def verify_password(password: str, stored_hash: str, stored_salt: str) -> bool:
    try:
        salt = base64.urlsafe_b64decode(stored_salt.encode("ascii"))
    except Exception:
        return False
    candidate, _ = password_hash(password, salt)
    return hmac.compare_digest(candidate, stored_hash)


def current_user() -> dict | None:
    user = st.session_state.get(SESSION_KEY)
    if not user:
        return None
    fresh = db.get_user(int(user["id"]))
    if not fresh or not fresh["ativo"]:
        st.session_state.pop(SESSION_KEY, None)
        return None
    return {"id": int(fresh["id"]), "username": fresh["username"], "nome": fresh["nome"], "papel": fresh["papel"]}


def login_gate() -> dict | None:
    user = current_user()
    if user:
        return user
    st.markdown(
        """
        <div style="max-width:420px;margin:12vh auto 0;padding:28px 30px;background:#fff;
        border:1px solid #dbeafe;border-radius:14px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#172033;">Custo Dashboard</div>
            <div style="font-size:13px;color:#64748b;margin-top:6px;">Acesso restrito a usuários autorizados</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    with st.form("login_form", clear_on_submit=False):
        username = st.text_input("Usuário", autocomplete="username")
        password = st.text_input("Senha", type="password", autocomplete="current-password")
        submit = st.form_submit_button("Entrar", type="primary", width="stretch")
    if submit:
        user = db.get_user_by_username(username)
        if user and user["ativo"] and verify_password(password, user["senha_hash"], user["salt"]):
            st.session_state[SESSION_KEY] = {
                "id": int(user["id"]),
                "username": user["username"],
                "nome": user["nome"],
                "papel": user["papel"],
            }
            st.rerun()
        st.error("Usuário ou senha inválidos.")
    return None


def logout() -> None:
    st.session_state.pop(SESSION_KEY, None)
    for key in ("dados", "fonte", "snapshot_ativo", "ver_analise", "local_atual", "local_hist"):
        st.session_state.pop(key, None)
    st.rerun()
