def fmt_moeda(valor) -> str:
    if valor is None:
        return "—"
    return f"R$ {valor:,.2f}".replace(",", "§").replace(".", ",").replace("§", ".")


def fmt_numero(valor, casas: int = 1) -> str:
    if valor is None:
        return "—"
    return f"{valor:,.{casas}f}".replace(",", "§").replace(".", ",").replace("§", ".")
