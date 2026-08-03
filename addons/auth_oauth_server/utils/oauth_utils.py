from werkzeug.exceptions import NotFound


def get_resource(env, resource_name: str):
    resource = env['oauth.resource'].sudo().search([('name', '=', resource_name)], limit=1)
    if not resource:
        raise NotFound(f"Unknown OAuth resource {resource_name!r}")
    return resource
