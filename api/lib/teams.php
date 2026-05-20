<?php

declare(strict_types=1);

/** @return list<string> */
function api_khl_team_slugs(): array
{
    return [
        'amur', 'avangard', 'admiral', 'akbars', 'avtomobilist', 'barys', 'vityaz',
        'dynamo-mn', 'dynamo-m', 'kunlun', 'lokomotiv', 'metallurg', 'neftekhimik',
        'salavat', 'severstal', 'sibir', 'ska', 'sochi', 'spartak', 'torpedo',
        'traktor', 'cska',
    ];
}

function api_validate_favorite_team(string $slug): ?string
{
    $slug = trim($slug);
    if ($slug === '') {
        return 'Выберите команду КХЛ';
    }
    if (!in_array($slug, api_khl_team_slugs(), true)) {
        return 'Неизвестная команда';
    }
    return null;
}
