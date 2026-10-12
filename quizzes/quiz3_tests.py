import numpy as np

a = np.array([
    # 8.4, 24.4, 11.4, 8.6, 25.2, 14.3
    # 1.7, 28.2, 13.8, 18.2, 19.3, 26.2
    15.0, 11.4, 1.9, 5.5, 18.5, 16.7
    ])
b = np.array([
    # 12.1, 15.3, 11.8, 15.5, 9.1, 26.8
    # 13.5, 2.9, 5.3, 13.3, 18.4, 8.9
    7.8, 12.2, 1.9, 10.7, 13.5, 14.8
])


def perspec_lerp(av, bv, t):
    aw = av / av[3]
    aw[3] = 1 / av[3]
    bw = bv / bv[3]
    bw[3] = 1 / bv[3]

    cw = (1-t)*aw + t*bw
    cv = cw
    cv[3] = 1 / cw[3]
    cv[4:] = cv[4:] * cv[3]
    return cv


print(perspec_lerp(a, b, 0.8))
